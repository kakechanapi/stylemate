// 嗜好学習（スワイプ履歴 + AI 推定）
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createSupabaseServerClient } from './supabase/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface StyleSwipe {
  id: string
  user_id: string
  image_url: string
  item_name?: string
  brand?: string
  liked: boolean
  source?: string
  created_at: string
}

export interface StyleProfile {
  user_id: string
  tags: string[]
  summary?: string
  swipe_count: number
  updated_at: string
}

export async function getStyleProfile(): Promise<StyleProfile | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('style_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) {
    console.error('[lib/style] getStyleProfile error:', error.message)
    return null
  }
  return data as StyleProfile | null
}

export async function listSwipes(opts?: { liked?: boolean; limit?: number }): Promise<StyleSwipe[]> {
  const supabase = await createSupabaseServerClient()
  let q = supabase.from('style_swipes').select('*').order('created_at', { ascending: false })
  if (opts?.liked !== undefined) q = q.eq('liked', opts.liked)
  if (opts?.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) return []
  return (data || []) as StyleSwipe[]
}

export async function recordSwipe(input: {
  image_url: string
  item_name?: string
  brand?: string
  liked: boolean
  source?: string
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not authenticated' }

  const { error } = await supabase.from('style_swipes').insert({
    user_id: user.id,
    image_url: input.image_url,
    item_name: input.item_name,
    brand: input.brand,
    liked: input.liked,
    source: input.source || 'manual',
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * 直近のスワイプから Gemini で系統推定し、style_profiles を upsert する。
 */
export async function refreshStyleProfile(): Promise<{ ok: boolean; profile?: StyleProfile; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not authenticated' }

  const likedSwipes = await listSwipes({ liked: true, limit: 50 })
  const dislikedSwipes = await listSwipes({ liked: false, limit: 30 })

  if (likedSwipes.length < 5) {
    return { ok: false, error: 'スワイプが少なすぎます（5件以上必要）' }
  }

  const likedSummary = likedSwipes
    .map((s) => `- ${s.item_name || '商品'}${s.brand ? `（${s.brand}）` : ''}`)
    .join('\n')
  const dislikedSummary = dislikedSwipes
    .map((s) => `- ${s.item_name || '商品'}${s.brand ? `（${s.brand}）` : ''}`)
    .join('\n')

  const prompt = `あなたはファッション系統を分析する AI です。以下はユーザーがスワイプで好き/嫌い判定したアイテムです。

【好きと判定したアイテム（${likedSwipes.length}件）】
${likedSummary}

${dislikedSwipes.length > 0
  ? `【嫌いと判定したアイテム（${dislikedSwipes.length}件）】\n${dislikedSummary}`
  : ''}

これらから、ユーザーの**ファッション嗜好（系統）**を推定してください。

【主要な系統の例】
- きれいめ / カジュアル / ストリート / フェミニン / モード / ナチュラル / 韓国系 / 古着MIX
- 地雷系 / 量産型 / ゴスロリ / 原宿系 / ガーリー / お姉系 / コンサバ

【返答形式：必ず JSON のみ、前後に余計なテキスト不要】
{
  "tags": ["タグ1", "タグ2", "タグ3"],
  "summary": "1〜2文でユーザー嗜好を要約（やさしいトーンで）"
}

タグは2〜4個に絞る。`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) throw new Error('invalid AI response')
    const parsed = JSON.parse(m[0]) as { tags: string[]; summary: string }

    // upsert
    const { data, error } = await supabase
      .from('style_profiles')
      .upsert({
        user_id: user.id,
        tags: parsed.tags || [],
        summary: parsed.summary || '',
        swipe_count: likedSwipes.length + dislikedSwipes.length,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, profile: data as StyleProfile }
  } catch (e) {
    console.error('[lib/style] refresh error:', e)
    return { ok: false, error: e instanceof Error ? e.message : '不明なエラー' }
  }
}
