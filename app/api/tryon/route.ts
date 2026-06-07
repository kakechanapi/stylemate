// AI 試着 API（IDM-VTON）
// POST: 試着開始 → predictionId 返却
// GET:  ?id=xxx で状態ポーリング、succeeded なら Supabase Storage に保存して URL 返却

import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  assertWithinMonthlyCap,
  logUsage,
  SERVICE_COSTS_JPY,
} from '@/lib/usage-cost'

// cuuupid/idm-vton（ECCV2024 採択 SOTA）
const MODEL_VERSION =
  '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985'

function getReplicate() {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return null
  return new Replicate({ auth: token })
}

// ─── POST: 試着開始 ───
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
    }

    const { humanImageBase64, clothingImageUrl, friendId, clothingId, garmentDescription } =
      await request.json()

    if (!humanImageBase64 || !clothingImageUrl || !friendId || !clothingId) {
      return NextResponse.json(
        {
          error: 'missing inputs',
          userMessage: '人物画像・服画像・友人ID・服IDが必要です。',
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

    // 月間上限チェック（試着1回 16円相当を確保できるか）
    try {
      await assertWithinMonthlyCap(SERVICE_COSTS_JPY.replicate_tryon)
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

    const prediction = await replicate.predictions.create({
      version: MODEL_VERSION,
      input: {
        human_img: humanImageBase64,
        garm_img: clothingImageUrl,
        garment_des: garmentDescription || 'clothing item',
        is_checked: true,
        is_checked_crop: true,
        denoise_steps: 40,
        seed: 42,
      },
    })

    // 使用ログ記録（試着開始時点で課金確定するため、ここで残す）
    void logUsage({
      service: 'replicate_tryon',
      operation: 'predictions.create',
      externalId: prediction.id,
      meta: { friendId, clothingId },
    })

    // tryons レコード作成（pending）
    const { data: tryon, error: insertError } = await supabase
      .from('tryons')
      .insert({
        user_id: user.id,
        friend_id: friendId,
        clothing_id: clothingId,
        prediction_id: prediction.id,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[api/tryon POST] tryons insert error:', insertError.message)
    }

    return NextResponse.json({
      tryonId: tryon?.id,
      predictionId: prediction.id,
      status: prediction.status,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー'
    const lower = message.toLowerCase()
    let userMessage = '試着生成に失敗しました。少し時間をおいて再度お試しください。'
    let status = 500

    if (lower.includes('402') || lower.includes('insufficient credit')) {
      userMessage = 'クレジット残高が不足しています。'
      status = 503
    } else if (lower.includes('429') || lower.includes('rate limit')) {
      userMessage = '短時間にたくさん試着しすぎました。少し時間をあけてお試しください。'
      status = 429
    } else if (lower.includes('face') || lower.includes('image')) {
      userMessage = '画像をうまく処理できませんでした。正面を向いた写真でお試しください。'
      status = 400
    }

    console.error('[api/tryon POST] error:', message)
    return NextResponse.json({ error: message, userMessage }, { status })
  }
}

// ─── GET: 状態ポーリング ───
export async function GET(request: NextRequest) {
  const tryonId = request.nextUrl.searchParams.get('tryonId')
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

    // 失敗時：tryons を failed に更新
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      if (tryonId) {
        await supabase
          .from('tryons')
          .update({
            status: 'failed',
            error: typeof prediction.error === 'string' ? prediction.error : 'failed',
          })
          .eq('id', tryonId)
      }
      return NextResponse.json({
        status: prediction.status,
        error: prediction.error || null,
      })
    }

    // 成功時：Storage に保存 → tryons を succeeded に更新
    if (prediction.status === 'succeeded') {
      const tempUrl = Array.isArray(prediction.output)
        ? String(prediction.output[0])
        : String(prediction.output)

      let publicUrl: string | null = null
      try {
        const imgRes = await fetch(tempUrl)
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer())
          const ext = (imgRes.headers.get('content-type') || 'image/png').split('/')[1] || 'png'
          const path = `${user.id}/${tryonId || predictionId}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from('tryon-results')
            .upload(path, buf, {
              contentType: imgRes.headers.get('content-type') || 'image/png',
              upsert: true,
            })
          if (uploadError) {
            console.error('[api/tryon GET] storage upload error:', uploadError.message)
          } else {
            const { data: pub } = supabase.storage.from('tryon-results').getPublicUrl(path)
            publicUrl = pub.publicUrl
          }
        }
      } catch (e) {
        console.error('[api/tryon GET] image fetch/upload error:', e)
      }

      if (tryonId) {
        await supabase
          .from('tryons')
          .update({ status: 'succeeded', result_url: publicUrl || tempUrl })
          .eq('id', tryonId)
      }

      return NextResponse.json({
        status: 'succeeded',
        resultUrl: publicUrl || tempUrl,
      })
    }

    // pending / processing
    return NextResponse.json({ status: prediction.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー'
    console.error('[api/tryon GET] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const maxDuration = 60
