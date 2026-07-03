// コーデ試着 API（IDM-VTON 流用・自分用）
// 既存 /api/tryon は friend_id 必須なのでそれとは別エンドポイント。
//
// POST：clothingId のみ受け取り、服の画像 URL は必ずサーバー側で clothes テーブルから引く
//       （任意 URL を渡して汎用試着サービスとして悪用されるのを防ぐ）。
//       キャッシュキー = clothingId + 服画像URLのハッシュ。photoVersion フォルダ配下に置くので
//       「自分写真を差し替えた」「服の画像を差し替えた」のどちらでも自動で再生成される。
// GET ：個別ポーリング。succeeded したら private バケットに保存して signed URL を返す。
//
// プライバシー方針：
// - 人物画像は IndexedDB 由来の base64 を受け取り、DB に保存しない
// - 試着結果（顔が映る）は private バケット `coord-tryon-results` に保存し、
//   期限付き signed URL でのみ配信（migration 0010）

import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createHash } from 'crypto'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkAdmin } from '@/lib/admin'
import { logEvent } from '@/lib/app-events'
import {
  assertWithinMonthlyCap,
  logUsage,
  SERVICE_COSTS_JPY,
} from '@/lib/usage-cost'

// cuuupid/idm-vton（既存 /api/tryon と同じバージョン）
const MODEL_VERSION =
  '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985'

const BUCKET = 'coord-tryon-results'
const SIGNED_URL_TTL_SEC = 60 * 60 * 24 // 24時間（キャッシュヒット毎に再発行される）

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// cacheKey = {uuid}-{hash8}。Storage パスに入るので形式を厳密に縛る（../ 等の混入防止）
const CACHE_KEY_RE = /^[0-9a-f-]{36}-[0-9a-f]{8}$/i

function getReplicate() {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return null
  return new Replicate({ auth: token })
}

function storageFolder(userId: string, photoVersion: number) {
  return `${userId}/coord/v${photoVersion}`
}

function buildCacheKey(clothingId: string, imageUrl: string) {
  const hash = createHash('sha1').update(imageUrl).digest('hex').slice(0, 8)
  return `${clothingId}-${hash}`
}

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>

/** キャッシュ存在チェック：あれば signed URL、なければ null */
async function findCached(
  supabase: SupabaseServer,
  userId: string,
  photoVersion: number,
  cacheKey: string
): Promise<string | null> {
  const folder = storageFolder(userId, photoVersion)
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    search: cacheKey,
    limit: 5,
  })
  if (error || !data) return null
  const hit = data.find((f) => f.name.startsWith(cacheKey + '.'))
  if (!hit) return null
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(`${folder}/${hit.name}`, SIGNED_URL_TTL_SEC)
  if (signErr || !signed) return null
  return signed.signedUrl
}

// ─── POST: 並列試着 + キャッシュチェック ───
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
    }

    // 暫定：管理者のみ利用可能（MVP 検証フェーズ）
    const admin = await checkAdmin()
    if (!admin.isAdmin) {
      return NextResponse.json(
        {
          error: 'forbidden',
          userMessage: 'コーデ試着は現在ベータ機能で、管理者のみご利用いただけます。',
        },
        { status: 403 }
      )
    }

    const { humanImageBase64, items, photoVersion } = (await request.json()) as {
      humanImageBase64?: string
      items?: Array<{ clothingId?: string }>
      photoVersion?: number
    }
    if (!humanImageBase64 || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          error: 'missing inputs',
          userMessage: '人物画像と試着するアイテムが必要です。',
        },
        { status: 400 }
      )
    }
    const clothingIds = items.map((it) => it.clothingId || '')
    if (clothingIds.some((id) => !UUID_RE.test(id))) {
      return NextResponse.json(
        { error: 'invalid clothingId', userMessage: '服の指定が不正です。' },
        { status: 400 }
      )
    }
    const pv = Number.isInteger(photoVersion) && photoVersion! > 0 ? photoVersion! : 1

    // 服の情報はサーバー側で引く（自分の服しか試着できない）
    const { data: clothesRows, error: clothesErr } = await supabase
      .from('clothes')
      .select('id, name, image_url')
      .in('id', clothingIds)
      .eq('user_id', user.id)
    if (clothesErr) {
      return NextResponse.json(
        { error: clothesErr.message, userMessage: '服の情報を取得できませんでした。' },
        { status: 500 }
      )
    }
    const clothById = new Map((clothesRows || []).map((c) => [c.id as string, c]))

    // 各 item を「キャッシュヒット / 新規生成 / 不正」に振り分け
    const prepared = await Promise.all(
      clothingIds.map(async (id, index) => {
        const cloth = clothById.get(id)
        if (!cloth || !cloth.image_url) {
          return { index, id, cloth: null, cacheKey: null, cachedUrl: null }
        }
        const cacheKey = buildCacheKey(id, cloth.image_url as string)
        const cachedUrl = await findCached(supabase, user.id, pv, cacheKey)
        return { index, id, cloth, cacheKey, cachedUrl }
      })
    )
    const needsCreate = prepared.filter((p) => p.cloth && !p.cachedUrl)

    // 新規作成分の月間上限チェック（キャッシュヒットは無料）
    if (needsCreate.length > 0) {
      try {
        await assertWithinMonthlyCap(
          SERVICE_COSTS_JPY.replicate_tryon * needsCreate.length
        )
      } catch (e) {
        return NextResponse.json(
          {
            error: 'monthly_cap_exceeded',
            userMessage:
              e instanceof Error
                ? e.message
                : '今月の使用上限に達しました。来月までお待ちください。',
          },
          { status: 429 }
        )
      }
    }

    const replicate = getReplicate()
    if (!replicate && needsCreate.length > 0) {
      return NextResponse.json(
        {
          error: 'REPLICATE_API_TOKEN not set',
          userMessage: 'アプリの設定に問題があります。',
        },
        { status: 500 }
      )
    }

    const results = await Promise.all(
      prepared.map(async (p) => {
        if (!p.cloth || !p.cacheKey) {
          return {
            caseIndex: p.index,
            predictionId: null,
            status: 'failed' as const,
            cached: false,
            error: '服が見つからないか、画像がありません。',
          }
        }
        if (p.cachedUrl) {
          return {
            caseIndex: p.index,
            predictionId: null,
            status: 'succeeded' as const,
            resultUrl: p.cachedUrl,
            cached: true,
            photoVersion: pv,
            cacheKey: p.cacheKey,
          }
        }
        try {
          const prediction = await replicate!.predictions.create({
            version: MODEL_VERSION,
            input: {
              human_img: humanImageBase64,
              garm_img: p.cloth.image_url,
              garment_des: (p.cloth.name as string) || 'clothing item',
              is_checked: true,
              is_checked_crop: true,
              denoise_steps: 40,
              seed: 42,
            },
          })
          // 課金確定時点で記録。void だと Vercel の凍結で欠落しうるので await
          await logUsage({
            service: 'replicate_tryon',
            operation: 'coord-tryon.create',
            externalId: prediction.id,
            meta: { caseIndex: p.index, clothingId: p.id },
          })
          return {
            caseIndex: p.index,
            predictionId: prediction.id,
            status: prediction.status,
            cached: false,
            photoVersion: pv,
            cacheKey: p.cacheKey,
          }
        } catch (e) {
          console.error(`[coord-tryon] case ${p.index} create error:`, e)
          return {
            caseIndex: p.index,
            predictionId: null,
            status: 'failed' as const,
            cached: false,
            photoVersion: pv,
            cacheKey: p.cacheKey,
            error: e instanceof Error ? e.message : '不明なエラー',
          }
        }
      })
    )

    // 計測：試着体験の利用状況（キャッシュヒット率＝実コスト分析にも使う）
    await logEvent('tryon_generated', {
      requested: results.length,
      cached: results.filter((r) => 'cached' in r && r.cached).length,
    })

    return NextResponse.json({ predictions: results })
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー'
    console.error('[api/coord-tryon POST] error:', message)
    return NextResponse.json(
      { error: message, userMessage: '試着生成に失敗しました。' },
      { status: 500 }
    )
  }
}

// ─── GET: 個別ポーリング ───
export async function GET(request: NextRequest) {
  const predictionId = request.nextUrl.searchParams.get('predictionId')
  const photoVersionStr = request.nextUrl.searchParams.get('photoVersion')
  const cacheKey = request.nextUrl.searchParams.get('cacheKey')
  if (!predictionId) {
    return NextResponse.json({ error: 'missing predictionId' }, { status: 400 })
  }
  const photoVersion = Number(photoVersionStr)
  // cacheKey は Storage パスに入るので形式チェック必須（パストラバーサル防止）
  if (!Number.isInteger(photoVersion) || photoVersion <= 0 || !cacheKey || !CACHE_KEY_RE.test(cacheKey)) {
    return NextResponse.json(
      { error: 'missing or invalid photoVersion / cacheKey' },
      { status: 400 }
    )
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  }

  const replicate = getReplicate()
  if (!replicate) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not set' }, { status: 500 })
  }

  try {
    const prediction = await replicate.predictions.get(predictionId)

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      return NextResponse.json({
        status: prediction.status,
        error: prediction.error || null,
      })
    }

    if (prediction.status === 'succeeded') {
      const tempUrl = Array.isArray(prediction.output)
        ? String(prediction.output[0])
        : String(prediction.output)

      // private バケットにユーザー隔離保存 → signed URL で返す
      let signedUrl: string | null = null
      try {
        const imgRes = await fetch(tempUrl)
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer())
          const ext =
            (imgRes.headers.get('content-type') || 'image/png').split('/')[1] || 'png'
          const path = `${storageFolder(user.id, photoVersion)}/${cacheKey}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, buf, {
              contentType: imgRes.headers.get('content-type') || 'image/png',
              upsert: true,
            })
          if (uploadError) {
            console.error('[api/coord-tryon GET] storage upload error:', uploadError.message)
          } else {
            const { data: signed } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(path, SIGNED_URL_TTL_SEC)
            signedUrl = signed?.signedUrl || null
          }
        }
      } catch (e) {
        console.error('[api/coord-tryon GET] image fetch/upload error:', e)
      }

      // Storage 保存に失敗した場合は Replicate の一時 URL でフォールバック
      // （migration 0010 未実行でも機能自体は動く。ただし URL は約1時間で失効）
      return NextResponse.json({
        status: 'succeeded',
        resultUrl: signedUrl || tempUrl,
      })
    }

    return NextResponse.json({ status: prediction.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー'
    console.error('[api/coord-tryon GET] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const maxDuration = 60
