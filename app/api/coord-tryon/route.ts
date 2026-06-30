// コーデ試着 API（IDM-VTON 流用・自分用）
// 既存 /api/tryon は friend_id 必須なのでそれとは別エンドポイント。
//
// POST：指定アイテムを並列で試着開始。photoVersion + clothingId をキャッシュキーに
//       Storage を先に検索し、ヒットしたら predictions.create をスキップ。
// GET ：個別ポーリング。succeeded したら Storage に保存して publicUrl 返す。
//
// プライバシー方針：
// - 人物画像は IndexedDB 由来の base64 を受け取り、DB に保存しない
// - 試着結果のみ Storage `tryon-results` に保存（パス：{user_id}/coord/v{photoVersion}/{clothingId}.{ext}）
// - photoVersion を組み込むことで「自分写真を更新したら旧キャッシュは使われない」

import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkAdmin } from '@/lib/admin'
import {
  assertWithinMonthlyCap,
  logUsage,
  SERVICE_COSTS_JPY,
} from '@/lib/usage-cost'

const MODEL_VERSION =
  '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985'

const BUCKET = 'tryon-results'

function getReplicate() {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return null
  return new Replicate({ auth: token })
}

interface CoordItem {
  clothingImageUrl: string
  clothingId: string
  garmentDescription?: string
}

function storageFolder(userId: string, photoVersion: number) {
  return `${userId}/coord/v${photoVersion}`
}

/** キャッシュ存在チェック：あれば publicUrl、なければ null */
async function findCached(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  photoVersion: number,
  clothingId: string
): Promise<string | null> {
  const folder = storageFolder(userId, photoVersion)
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    search: clothingId,
    limit: 5,
  })
  if (error || !data) return null
  // clothingId.png / clothingId.jpg など、`clothingId.` で始まるファイル
  const hit = data.find((f) => f.name.startsWith(clothingId + '.'))
  if (!hit) return null
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(`${folder}/${hit.name}`)
  return pub.publicUrl
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
      items?: CoordItem[]
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
    const pv = Number.isInteger(photoVersion) && photoVersion! > 0 ? photoVersion! : 1

    // 各 item をキャッシュチェック + 新規 create に振り分け
    const cacheResults = await Promise.all(
      items.map(async (item, index) => {
        const cachedUrl = await findCached(supabase, user.id, pv, item.clothingId)
        return { index, item, cachedUrl }
      })
    )
    const needsCreate = cacheResults.filter((r) => !r.cachedUrl)

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

    // 各案を並列処理：キャッシュは即返す、新規のみ predictions.create
    const results = await Promise.all(
      cacheResults.map(async (r) => {
        if (r.cachedUrl) {
          return {
            caseIndex: r.index,
            predictionId: null,
            status: 'succeeded' as const,
            resultUrl: r.cachedUrl,
            cached: true,
            photoVersion: pv,
            clothingId: r.item.clothingId,
          }
        }
        try {
          const prediction = await replicate!.predictions.create({
            version: MODEL_VERSION,
            input: {
              human_img: humanImageBase64,
              garm_img: r.item.clothingImageUrl,
              garment_des: r.item.garmentDescription || 'clothing item',
              is_checked: true,
              is_checked_crop: true,
              denoise_steps: 40,
              seed: 42,
            },
          })
          void logUsage({
            service: 'replicate_tryon',
            operation: 'coord-tryon.create',
            externalId: prediction.id,
            meta: { caseIndex: r.index, clothingId: r.item.clothingId },
          })
          return {
            caseIndex: r.index,
            predictionId: prediction.id,
            status: prediction.status,
            cached: false,
            photoVersion: pv,
            clothingId: r.item.clothingId,
          }
        } catch (e) {
          console.error(`[coord-tryon] case ${r.index} create error:`, e)
          return {
            caseIndex: r.index,
            predictionId: null,
            status: 'failed' as const,
            cached: false,
            photoVersion: pv,
            clothingId: r.item.clothingId,
            error: e instanceof Error ? e.message : '不明なエラー',
          }
        }
      })
    )

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
  const clothingId = request.nextUrl.searchParams.get('clothingId')
  if (!predictionId) {
    return NextResponse.json({ error: 'missing predictionId' }, { status: 400 })
  }
  // photoVersion + clothingId はキャッシュ保存先計算のため必須
  const photoVersion = Number(photoVersionStr)
  if (!Number.isInteger(photoVersion) || photoVersion <= 0 || !clothingId) {
    return NextResponse.json(
      { error: 'missing photoVersion or clothingId' },
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

      // 顔が映るので Storage にユーザー隔離保存。
      // パスを clothingId ベースにしてキャッシュ再利用可能に。
      let publicUrl: string | null = null
      try {
        const imgRes = await fetch(tempUrl)
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer())
          const ext =
            (imgRes.headers.get('content-type') || 'image/png').split('/')[1] || 'png'
          const path = `${storageFolder(user.id, photoVersion)}/${clothingId}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, buf, {
              contentType: imgRes.headers.get('content-type') || 'image/png',
              upsert: true,
            })
          if (uploadError) {
            console.error('[api/coord-tryon GET] storage upload error:', uploadError.message)
          } else {
            const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
            publicUrl = pub.publicUrl
          }
        }
      } catch (e) {
        console.error('[api/coord-tryon GET] image fetch/upload error:', e)
      }

      return NextResponse.json({
        status: 'succeeded',
        resultUrl: publicUrl || tempUrl,
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
