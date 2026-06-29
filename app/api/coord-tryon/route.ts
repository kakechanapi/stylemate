// コーデ試着 API（IDM-VTON 流用・自分用）
// 既存 /api/tryon は friend_id 必須なのでそれとは別エンドポイント。
// 3案並列対応：1 POST で複数案分の predictions を並列作成し、各 predictionId を返す。
// フロント側で個別ポーリング（GET）して結果画像を取得・表示。
//
// プライバシー方針：
// - 人物画像は IndexedDB 由来の base64 を受け取り、DB に保存しない
// - 試着結果のみ Supabase Storage `tryon-results` に保存（パス：{user_id}/coord/{predictionId}.png）
// - 結果画像も顔が映るので、ユーザーごとに隔離

import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkAdmin } from '@/lib/admin'
import {
  assertWithinMonthlyCap,
  logUsage,
  SERVICE_COSTS_JPY,
} from '@/lib/usage-cost'

// cuuupid/idm-vton（既存 /api/tryon と同じバージョン）
const MODEL_VERSION =
  '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985'

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

// ─── POST: 3案分の試着を並列起動 ───
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

    const { humanImageBase64, items } = (await request.json()) as {
      humanImageBase64?: string
      items?: CoordItem[]
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

    const replicate = getReplicate()
    if (!replicate) {
      return NextResponse.json(
        {
          error: 'REPLICATE_API_TOKEN not set',
          userMessage: 'アプリの設定に問題があります。',
        },
        { status: 500 }
      )
    }

    // 3案分の月間上限を確保（試着 1回 × アイテム数）
    try {
      await assertWithinMonthlyCap(SERVICE_COSTS_JPY.replicate_tryon * items.length)
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

    // 各案を並列で predictions.create
    const results = await Promise.all(
      items.map(async (item, index) => {
        try {
          const prediction = await replicate.predictions.create({
            version: MODEL_VERSION,
            input: {
              human_img: humanImageBase64,
              garm_img: item.clothingImageUrl,
              garment_des: item.garmentDescription || 'clothing item',
              is_checked: true,
              is_checked_crop: true,
              denoise_steps: 40,
              seed: 42,
            },
          })
          // 使用ログ
          void logUsage({
            service: 'replicate_tryon',
            operation: 'coord-tryon.create',
            externalId: prediction.id,
            meta: { caseIndex: index, clothingId: item.clothingId },
          })
          return {
            caseIndex: index,
            predictionId: prediction.id,
            status: prediction.status,
          }
        } catch (e) {
          console.error(`[coord-tryon] case ${index} create error:`, e)
          return {
            caseIndex: index,
            predictionId: null,
            status: 'failed',
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
  if (!predictionId) {
    return NextResponse.json({ error: 'missing predictionId' }, { status: 400 })
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

      // 顔が映るので Storage にユーザー隔離保存
      let publicUrl: string | null = null
      try {
        const imgRes = await fetch(tempUrl)
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer())
          const ext =
            (imgRes.headers.get('content-type') || 'image/png').split('/')[1] || 'png'
          const path = `${user.id}/coord/${predictionId}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from('tryon-results')
            .upload(path, buf, {
              contentType: imgRes.headers.get('content-type') || 'image/png',
              upsert: true,
            })
          if (uploadError) {
            console.error('[api/coord-tryon GET] storage upload error:', uploadError.message)
          } else {
            const { data: pub } = supabase.storage
              .from('tryon-results')
              .getPublicUrl(path)
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
