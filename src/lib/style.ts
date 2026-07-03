// 嗜好学習（スワイプ履歴 + AI 推定）
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createSupabaseServerClient } from './supabase/server'
import { logUsage } from './usage-cost'
import { toJSTDateStr } from './date-helpers'

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

export async function listSwipes(opts?: {
  liked?: boolean
  limit?: number
  /** この source のみに絞る（例：['outfit_confirm']） */
  sources?: string[]
  /** この source を除外する（例：['outfit_unchosen']） */
  excludeSources?: string[]
}): Promise<StyleSwipe[]> {
  const supabase = await createSupabaseServerClient()
  let q = supabase.from('style_swipes').select('*').order('created_at', { ascending: false })
  if (opts?.liked !== undefined) q = q.eq('liked', opts.liked)
  if (opts?.sources && opts.sources.length > 0) q = q.in('source', opts.sources)
  if (opts?.excludeSources && opts.excludeSources.length > 0) {
    // source が NULL の行も残したいので or 条件で書く
    q = q.or(`source.is.null,source.not.in.(${opts.excludeSources.join(',')})`)
  }
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

  // シグナル強度別に取得する。
  // - スワイプ/固定の LIKE と、コーデ確定（実際に着ると決めた）は別枠で取り、
  //   確定 LIKE の洪水がスワイプ由来データを 50件枠から押し出すのを防ぐ
  // - outfit_unchosen（A/B/C で選ばれなかっただけ）は「嫌い」ではないので、
  //   明示的な嫌いと混ぜず、弱い参考情報としてラベル分けして渡す
  const [likedSwipes, confirmedLikes, dislikedSwipes, unchosenSwipes] = await Promise.all([
    listSwipes({ liked: true, excludeSources: ['outfit_confirm'], limit: 40 }),
    listSwipes({ liked: true, sources: ['outfit_confirm'], limit: 30 }),
    listSwipes({ liked: false, excludeSources: ['outfit_unchosen'], limit: 30 }),
    listSwipes({ liked: false, sources: ['outfit_unchosen'], limit: 20 }),
  ])

  const totalLikes = likedSwipes.length + confirmedLikes.length
  if (totalLikes < 5) {
    return { ok: false, error: 'スワイプが少なすぎます（5件以上必要）' }
  }

  const fmt = (list: StyleSwipe[]) =>
    list.map((s) => `- ${s.item_name || '商品'}${s.brand ? `（${s.brand}）` : ''}`).join('\n')

  const prompt = `あなたはファッション系統を分析する AI です。以下はユーザーの行動から得られた好みのシグナルです。シグナルの強さを考慮して分析してください。

【好きと判定したアイテム（スワイプ・${likedSwipes.length}件）】
${fmt(likedSwipes)}

${confirmedLikes.length > 0
  ? `【実際に「今日のコーデ」として選んだ服（最も強い好みシグナル・${confirmedLikes.length}件）】\n${fmt(confirmedLikes)}\n`
  : ''}
${dislikedSwipes.length > 0
  ? `【嫌いと判定したアイテム（${dislikedSwipes.length}件）】\n${fmt(dislikedSwipes)}\n`
  : ''}
${unchosenSwipes.length > 0
  ? `【提案されたが選ばれなかった服（弱い参考シグナル・嫌いとは限らない・${unchosenSwipes.length}件）】\n${fmt(unchosenSwipes)}\n`
  : ''}
これらから、ユーザーの**ファッション嗜好**を多角的に推定してください。
「選ばれなかった服」は好きな服が含まれることもあるため、明確な傾向（同じ系統が繰り返し選ばれない等）がある場合のみ弱い減点材料として扱うこと。

【考慮する観点】
1. **系統**：きれいめ / カジュアル / ストリート / フェミニン / モード / ナチュラル / 韓国系 / 古着MIX / 地雷系 / 量産型 / ゴスロリ / 原宿系 / ガーリー / お姉系 / コンサバ など
2. **カラー**：モノトーン / 淡色 / ビビッド / アースカラー / パステル など
3. **パターン**：無地中心 / 柄物好み / ボーダー・ストライプ多め など
4. **シルエット**：タイト / ゆったり / オーバーサイズ / マニッシュ など
5. **テイスト**：シンプル / 装飾的 / レトロ / モード など

【返答形式：必ず JSON のみ、前後に余計なテキスト不要】
{
  "tags": ["系統タグ1", "系統タグ2", "カラータグ", "シルエットor柄タグ"],
  "summary": "1〜2文で嗜好を要約（系統・色・柄を踏まえて。やさしいトーンで）"
}

タグは合計 3〜5個に絞る。最低 1個は系統、1個はカラー or 柄、1個はシルエット or テイストを含めること。`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    // 使用ログ（void は Vercel で実行保証がないため await）
    await logUsage({
      service: 'gemini_style_profile',
      operation: 'refreshStyleProfile',
      tokensIn: Math.ceil(prompt.length / 4),
      tokensOut: Math.ceil(text.length / 4),
    })
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
        swipe_count:
          likedSwipes.length + confirmedLikes.length + dislikedSwipes.length + unchosenSwipes.length,
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

/**
 * コーデ決定時の学習フィードバック。
 * - 採用したコーデの各服 → LIKE として style_swipes に記録（source: 'outfit_confirm'）
 * - A/B/C で採用されなかった案の各服 → NOPE として記録（source: 'outfit_unchosen'）
 *   ただし採用案にも含まれる服は除外（同じ服が複数案で提案された場合の保護）
 *
 * これによりスワイプ画面でなくても、毎日の「決定」が学習データになる。
 * 5件の決定でだいたい style_profiles が自動更新されるタイミングに乗る。
 */
export async function recordOutfitChoice(input: {
  chosen_cloth_ids: string[]
  rejected_cloth_ids?: string[]
}): Promise<{ ok: boolean; liked: number; noped: number; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, liked: 0, noped: 0, error: 'not authenticated' }

  const chosen = Array.from(new Set(input.chosen_cloth_ids || []))
  const rejectedRaw = Array.from(new Set(input.rejected_cloth_ids || []))
  // 採用案にも含まれる服は NOPE から除外（複数案で重複提案された服は保護）
  const chosenSet = new Set(chosen)
  const rejected = rejectedRaw.filter((id) => !chosenSet.has(id))

  if (chosen.length === 0 && rejected.length === 0) {
    return { ok: true, liked: 0, noped: 0 }
  }

  // 同日重複ガード：リセット→再確定を繰り返すたびに同じ服の LIKE が
  // 積み増しされてプロファイルが偏るのを防ぐ。今日すでに確定記録があればスキップ。
  const jstDayStart = new Date(`${toJSTDateStr()}T00:00:00+09:00`).toISOString()
  const { count: todayCount } = await supabase
    .from('style_swipes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('source', 'outfit_confirm')
    .gte('created_at', jstDayStart)
  if ((todayCount || 0) > 0) {
    return { ok: true, liked: 0, noped: 0 }
  }

  // 必要な服の情報を一括取得（image_url 必須 = style_swipes の NOT NULL 制約）
  const allIds = Array.from(new Set([...chosen, ...rejected]))
  const { data: clothes, error: fetchErr } = await supabase
    .from('clothes')
    .select('id, name, brand, image_url')
    .in('id', allIds)
    .eq('user_id', user.id)
  if (fetchErr) {
    return { ok: false, liked: 0, noped: 0, error: fetchErr.message }
  }

  // 画像なし服は学習に使えない（image_url が NOT NULL なので insert で失敗する）
  const byId = new Map(
    (clothes || [])
      .filter((c) => c.image_url)
      .map((c) => [c.id as string, c])
  )

  const rows: Array<{
    user_id: string
    image_url: string
    item_name: string | null
    brand: string | null
    liked: boolean
    source: string
  }> = []

  for (const id of chosen) {
    const c = byId.get(id)
    if (!c) continue
    rows.push({
      user_id: user.id,
      image_url: c.image_url as string,
      item_name: (c.name as string) || null,
      brand: (c.brand as string) || null,
      liked: true,
      source: 'outfit_confirm',
    })
  }
  for (const id of rejected) {
    const c = byId.get(id)
    if (!c) continue
    rows.push({
      user_id: user.id,
      image_url: c.image_url as string,
      item_name: (c.name as string) || null,
      brand: (c.brand as string) || null,
      liked: false,
      source: 'outfit_unchosen',
    })
  }

  if (rows.length === 0) return { ok: true, liked: 0, noped: 0 }

  const { error: insertErr } = await supabase.from('style_swipes').insert(rows)
  if (insertErr) {
    console.error('[lib/style] recordOutfitChoice insert error:', insertErr.message)
    return { ok: false, liked: 0, noped: 0, error: insertErr.message }
  }

  return {
    ok: true,
    liked: rows.filter((r) => r.liked).length,
    noped: rows.filter((r) => !r.liked).length,
  }
}
