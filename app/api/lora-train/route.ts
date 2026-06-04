// Phase 5: LoRA 訓練 API
// POST: 訓練開始（zipUrl + friend_id を受け取り、Replicate に投げる）
// GET:  ?id=trainingId で進捗ポーリング、完了時に LoRA URL を friends.lora_url に保存

import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ostris/flux-dev-lora-trainer の最新版
// 必要に応じて Replicate ダッシュボードで version を更新
const TRAINER = 'ostris/flux-dev-lora-trainer'
const TRAINER_VERSION =
  'e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497' // ← 適宜更新

// 訓練成果物を保存する Replicate 上の destination
// 事前に kakechanapi/stylemate-loras を Replicate ダッシュボードで作成しておくこと
const DESTINATION = 'kakechanapi/stylemate-loras' as `${string}/${string}`

function getReplicate() {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return null
  return new Replicate({ auth: token })
}

// ─── POST: 訓練開始 ───
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
    }

    const { friendId, zipUrl, triggerWord } = await request.json()

    if (!friendId || !zipUrl) {
      return NextResponse.json(
        {
          error: 'missing inputs',
          userMessage: 'friend_id と zipUrl が必要です',
        },
        { status: 400 }
      )
    }

    // friend は自分のものか確認
    const { data: friend, error: friendErr } = await supabase
      .from('friends')
      .select('id, user_id, lora_status, name')
      .eq('id', friendId)
      .single()

    if (friendErr || !friend || friend.user_id !== user.id) {
      return NextResponse.json(
        { error: 'friend not found or not yours', userMessage: '対象の人物が見つかりません' },
        { status: 404 }
      )
    }

    // 既に訓練中・訓練済なら拒否
    if (friend.lora_status === 'training' || friend.lora_status === 'pending') {
      return NextResponse.json(
        {
          error: 'already training',
          userMessage: '既に訓練中です。進捗をご確認ください。',
        },
        { status: 409 }
      )
    }

    const replicate = getReplicate()
    if (!replicate) {
      return NextResponse.json(
        { error: 'REPLICATE_API_TOKEN not set', userMessage: 'サーバー設定エラー' },
        { status: 500 }
      )
    }

    // Trigger word: 後の推論時に「TOK person」等の形でこのトークンを呼び出す
    // フレンド単位でユニークにしておく
    const tok = triggerWord || `TOK${friendId.slice(0, 6).replace(/-/g, '')}`

    // 訓練開始
    const training = await replicate.trainings.create(
      TRAINER.split('/')[0],
      TRAINER.split('/')[1],
      TRAINER_VERSION,
      {
        destination: DESTINATION,
        input: {
          input_images: zipUrl,
          trigger_word: tok,
          steps: 1000,
          lora_rank: 16,
          optimizer: 'adamw8bit',
          autocaption: true,
          learning_rate: 0.0004,
        },
      }
    )

    // friends を更新（status='training' + training_id を保存）
    await supabase
      .from('friends')
      .update({
        lora_status: 'training',
        lora_training_id: training.id,
      })
      .eq('id', friendId)

    return NextResponse.json({
      trainingId: training.id,
      status: training.status,
      triggerWord: tok,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー'
    const lower = message.toLowerCase()
    let userMessage = '訓練の開始に失敗しました。少し時間をおいて再度お試しください。'
    let status = 500

    if (lower.includes('402') || lower.includes('insufficient credit')) {
      userMessage = 'Replicate のクレジット残高が不足しています。'
      status = 503
    } else if (lower.includes('429') || lower.includes('rate limit')) {
      userMessage = 'リクエストが多すぎます。少し時間を空けてください。'
      status = 429
    }

    console.error('[api/lora-train POST] error:', message)
    return NextResponse.json({ error: message, userMessage }, { status })
  }
}

// ─── GET: 進捗ポーリング ───
export async function GET(request: NextRequest) {
  const trainingId = request.nextUrl.searchParams.get('id')
  if (!trainingId) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 })
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
    const training = await replicate.trainings.get(trainingId)

    // friends を特定
    const { data: friend } = await supabase
      .from('friends')
      .select('id, user_id, lora_status')
      .eq('lora_training_id', trainingId)
      .eq('user_id', user.id)
      .single()

    if (!friend) {
      return NextResponse.json({ error: 'friend not found' }, { status: 404 })
    }

    // 失敗時
    if (training.status === 'failed' || training.status === 'canceled') {
      await supabase
        .from('friends')
        .update({
          lora_status: 'failed',
          lora_training_id: null,
        })
        .eq('id', friend.id)
      return NextResponse.json({
        status: training.status,
        error: training.error || '訓練に失敗しました',
      })
    }

    // 成功時
    if (training.status === 'succeeded') {
      // output には訓練済モデルの version URL が入る
      // 例: { weights: "https://...safetensors", version: "kakechanapi/stylemate-loras:<sha>" }
      const output = training.output as
        | { weights?: string; version?: string }
        | string
        | null
      let loraUrl: string | null = null
      if (typeof output === 'string') {
        loraUrl = output
      } else if (output) {
        loraUrl = output.version || output.weights || null
      }

      if (loraUrl && friend.lora_status !== 'ready') {
        await supabase
          .from('friends')
          .update({
            lora_status: 'ready',
            lora_url: loraUrl,
            lora_trained_at: new Date().toISOString(),
          })
          .eq('id', friend.id)
      }

      return NextResponse.json({
        status: 'succeeded',
        loraUrl,
      })
    }

    // 進行中
    return NextResponse.json({
      status: training.status,
      progress: training.logs ? training.logs.slice(-200) : null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー'
    console.error('[api/lora-train GET] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const maxDuration = 60
