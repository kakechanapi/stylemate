// Gemini ベースのコーデ提案
// 入力：天気・TPO・予定タイトル・嗜好（任意）・所有服一覧
// 出力：コーデ提案 + 中身レイヤー + 理由 + 該当アイテムID

import { GoogleGenerativeAI } from '@google/generative-ai'
import { ClothingItem, TPO, WeatherData } from '@/types/fashion'
import { logUsage } from './usage-cost'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface OutfitSuggestion {
  suggestion: string // メイン提案テキスト（2〜3文、フレンドリー）
  reason: string // なぜこの提案？
  items: string[] // クローゼットアイテム名（人間が読む用）
  itemIds: string[] // クローゼットアイテムID（リンク用）
  layerHint?: string // 中身レイヤー提案（任意）
  /**
   * クローゼットに足りないカテゴリ（UI でガイド表示用）
   * 例：['ボトムス', '羽織り'] → 登録を促す
   */
  missingCategories?: string[]
}

/** カテゴリ ID と日本語ラベルのマッピング */
const CATEGORY_LABEL: Record<string, string> = {
  tops: 'トップス',
  bottoms: 'ボトムス',
  outerwear: '羽織り・アウター',
  dress: 'ワンピース',
  shoes: '靴',
  bag: 'バッグ',
  accessory: 'アクセサリー',
  other: 'その他',
}

/**
 * クローゼットのカテゴリ別所有数を集計
 * 提案 AI には「無理な提案を避ける」用に渡し、UI には「足りないカテゴリ」用に渡す
 */
function summarizeCloset(clothes: ClothingItem[]) {
  const counts: Record<string, number> = {}
  for (const c of clothes) {
    counts[c.category] = (counts[c.category] || 0) + 1
  }
  // 「コーデの根幹」に当たるカテゴリで 0 件なら、UI に登録を促す
  const ESSENTIAL = ['tops', 'bottoms', 'outerwear', 'dress']
  const missingCategories = ESSENTIAL
    .filter((cat) => !counts[cat])
    .map((cat) => CATEGORY_LABEL[cat])
  return { counts, missingCategories }
}

export interface SuggestionContext {
  weather: WeatherData | null
  tpo: TPO
  scheduleTitle?: string
  styleTags?: string[]
  recentClothIds?: string[]
  // 「固定」されたアイテム（必ず使う・他のアイテムはこれに合わせる）
  fixedItemIds?: string[]
  // 「却下」されたアイテム（絶対に使わない）
  excludedItemIds?: string[]
  // 自分のプロフィール（性別・身長・体型）。提案精度を上げるために渡す。
  me?: {
    gender?: string // '男性' / '女性' / '指定しない'
    height_cm?: number
    body_type?: string // 'スリム' / 'ふつう' / 'がっしり'
  }
}

export async function generateOutfitSuggestion(
  clothes: ClothingItem[],
  context: SuggestionContext
): Promise<OutfitSuggestion> {
  const tpoLabels: Record<TPO, string> = {
    casual: 'カジュアル',
    date: 'デート',
    work: '仕事・会議',
    party: 'パーティー',
    sport: 'スポーツ・アウトドア',
    formal: 'フォーマル',
  }

  const w = context.weather
  let weatherText: string
  if (w) {
    const apparent =
      w.apparentTemperature !== undefined && w.apparentTemperature !== w.temperature
        ? `（体感${w.apparentTemperature}℃）`
        : ''
    const wind = w.windSpeed !== undefined ? `、風速${w.windSpeed}m/s` : ''
    const ci = w.clothingIndex
      ? `\n服装指数：${w.clothingIndex.score}/100（${w.clothingIndex.label}）→ 目安：${w.clothingIndex.recommendation}`
      : ''
    weatherText = `今日の天気：${w.description}、気温${w.temperature}℃${apparent}、湿度${w.humidity}%${wind}${ci}`
  } else {
    weatherText = '天気情報なし'
  }

  const scheduleText = context.scheduleTitle ? `\n予定：${context.scheduleTitle}` : ''

  // 自分のプロフィール（性別など）
  const me = context.me
  const meParts: string[] = []
  if (me?.gender && me.gender !== '指定しない') meParts.push(`性別: ${me.gender}`)
  if (me?.height_cm) meParts.push(`身長: ${me.height_cm}cm`)
  if (me?.body_type) meParts.push(`体型: ${me.body_type}`)
  const meText = meParts.length > 0 ? `\nユーザー情報：${meParts.join('、')}` : ''

  const styleText =
    context.styleTags && context.styleTags.length > 0
      ? `\nユーザーの嗜好：${context.styleTags.join('、')}`
      : ''

  const recentText =
    context.recentClothIds && context.recentClothIds.length > 0
      ? `\n直近着用した服ID（被り回避：これらは避ける）：${context.recentClothIds.join(', ')}`
      : ''

  const fixedText =
    context.fixedItemIds && context.fixedItemIds.length > 0
      ? `\n【必ず使う服ID】これらは絶対に使い、これに合うアイテムを組み合わせること：${context.fixedItemIds.join(', ')}`
      : ''

  const excludedText =
    context.excludedItemIds && context.excludedItemIds.length > 0
      ? `\n【絶対に使わない服ID】ユーザーが却下：${context.excludedItemIds.join(', ')}`
      : ''

  const clothesSummary = clothes
    .map(
      (c) =>
        `- id="${c.id}" 名前="${c.name}" カテゴリ=${c.category} ブランド="${c.brand || '不明'}" 色="${c.color || '不明'}"`
    )
    .join('\n')

  // クローゼット全体の所有数。
  // AI が「ボトムスが 0 件だから無理して提案しない」を判断できるよう、明示的に渡す
  const { counts, missingCategories } = summarizeCloset(clothes)
  const closetStatsText = Object.keys(counts).length > 0
    ? `\n【クローゼットのカテゴリ別所有数】\n${Object.entries(counts)
        .map(([cat, n]) => `- ${CATEGORY_LABEL[cat] || cat}: ${n}点`)
        .join('\n')}`
    : ''
  const missingHintText = missingCategories.length > 0
    ? `\n【未登録カテゴリ】${missingCategories.join('・')}（0件のカテゴリは itemIds に含めようがないので、無理に言及しないこと）`
    : ''

  const prompt = `あなたは経験豊富な日本のファッションスタイリストです。以下の条件に基づき、ユーザーの所有服から最適なコーディネートを提案してください。

【入力情報】
${weatherText}
TPO: ${tpoLabels[context.tpo]}${meText}${scheduleText}${styleText}${recentText}${fixedText}${excludedText}

【ユーザーの所有服一覧】
${clothesSummary || '（まだ服が登録されていません）'}${closetStatsText}${missingHintText}

【コーデの構成パターン】
以下のいずれか1つを選び、それに沿って itemIds を組み立ててください：

▼ パターンA：ワンピース完結
  - 主役：ワンピース 1点（必須）
  - 任意で追加：羽織り（カーディガン・ジャケット等）／靴／バッグ／アクセサリー
  - 例：[ワンピース] / [ワンピース + カーディガン + バッグ]

▼ パターンB：トップス + ボトムス
  - 主役：トップス 1点 + ボトムス 1点（両方必須）
  - 任意で追加：羽織り／インナー（気温が低いとき）／靴／バッグ
  - 例：[Tシャツ + デニム] / [ニット + スカート + カーディガン + バッグ]

▼ パターンC：セットアップ
  - 主役：上下セット感のあるアイテム
  - 任意で追加：インナー／靴／バッグ

【最重要ルール】
1. 【実在縛り】itemIds に入れるのは、必ず「ユーザーの所有服一覧」にある id だけ。存在しないアイテムを itemIds に含めない
2. 【未登録カテゴリは諦める】「未登録カテゴリ」にあるカテゴリ（例：ボトムス 0件）は提案に含めようがない。
   この場合は無理に B パターンを選ばず、A パターン（ワンピ単体）または「トップスのみ + 羽織り」で完結させる。
   ただし suggestion 文に「お持ちのボトムスと…」のような実在しないアイテムへの言及はしない
3. 【構成数の下限】itemIds は基本 2 アイテム以上を目指す。クローゼットが極端に少ない場合は 1 アイテムでも可
4. 【lazy 禁止】「トップス + 同じくトップス」のような同カテゴリ2枚だけで完結させない。クローゼットにボトムスがあるなら必ず1点入れる
5. 【中身レイヤーの一貫性】"layerHint" で言及するアイテム（例：「中にヒートテック」）も必ず itemIds に含める。"layerHint" と "itemIds" が乖離してはいけない
6. 【羽織りの積極活用】カーディガン・ジャケット・コート等の羽織りがクローゼットにあって気温・TPO に合うなら、積極的に入れる
7. 【却下指定の尊重】「絶対に使わない服ID」があれば、その代替（同じカテゴリの別アイテム）を必ず別途入れる。アイテム数を減らさない

【気温別レイヤー】
   - 服装指数 80以上 / 28℃以上: 羽織りなし、涼しい素材
   - 服装指数 60〜80 / 22〜28℃: 半袖 + 朝晩用の薄手羽織り検討
   - 服装指数 40〜60 / 16〜22℃: 長袖 + 薄手カーディガン or ジャケット
   - 服装指数 20〜40 / 8〜16℃: 厚手アウター、中にヒートテック検討
   - 服装指数 20以下 / 8℃以下: ダウン・マフラー等しっかり防寒

【その他の指針】
- TPO・予定に合わせる（デート→きれいめ、ピクニック→カジュアル等）
- 被り回避指定があれば、その服IDは絶対に使わない
- ユーザーの嗜好（系統）を尊重する
- 風速が強い時（5m/s以上）は羽織りものを優先、雨/雪なら撥水素材も提案に含める
- 【最重要】ユーザー情報の性別を厳守。男性ユーザーにブラウス・スカート等の女性服を提案しない／女性ユーザーにメンズ専用アイテムを押し付けない。性別「指定しない」or未指定の場合のみ中性的提案OK
- 体型・身長があれば、シルエット選びの参考にする（がっしり→ゆとり、スリム→タイト等）

【返答形式：必ず JSON のみ、前後に余計なテキスト不要】
{
  "suggestion": "コーデの説明（2〜3文、フレンドリーなトーンで）",
  "reason": "なぜこの提案？（気温・TPO・レイヤーの根拠を簡潔に1〜2文）",
  "items": ["使う服の名前1", "使う服の名前2", ...],
  "itemIds": ["使う服のID1", "使う服のID2", ...],
  "layerHint": "中身レイヤーの補足（itemIds と乖離しないこと。不要なら空文字列）"
}

服が少ない場合でも、ある服を活かした提案をしてください。`

  try {
    const text = await callGeminiWithRetry(prompt)
    // 使用ログ（成功時のみ。失敗時はリトライ済で課金は変動する想定）
    void logUsage({
      service: 'gemini_outfit_suggest',
      operation: 'generateContent',
      tokensIn: Math.ceil(prompt.length / 4), // 概算（1トークン≒4文字）
      tokensOut: Math.ceil(text.length / 4),
    })
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        suggestion: parsed.suggestion || '今日のコーデを考え中…',
        reason: parsed.reason || '',
        items: Array.isArray(parsed.items) ? parsed.items : [],
        itemIds: Array.isArray(parsed.itemIds) ? parsed.itemIds : [],
        layerHint: parsed.layerHint || undefined,
        missingCategories,
      }
    }
  } catch (e) {
    console.error('[lib/gemini] all retries + fallback failed:', e)
  }

  return {
    suggestion:
      clothes.length === 0
        ? 'まずクローゼットに服を登録してみましょう！'
        : 'AI 提案に一時的に失敗しました。再試行してください。',
    reason: '',
    items: [],
    itemIds: [],
    missingCategories,
  }
}

/**
 * Gemini 呼び出しを「リトライ + フォールバックモデル」でラップ
 * - 503 / 429 / 5xx は 1s → 2s → 4s でバックオフして最大3回再試行
 * - プライマリ全滅したら別モデル (フォールバック) で同様に再試行
 * - それでもダメなら最後のエラーを throw
 */
const PRIMARY_MODEL = 'gemini-flash-latest'
const FALLBACK_MODEL = 'gemini-2.0-flash' // 安定運用のためのフォールバック
const MAX_RETRIES = 3

async function tryGeminiModel(modelName: string, prompt: string): Promise<string> {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (e) {
      lastError = e
      // status 取り出し（GoogleGenerativeAI Error は status プロパティを持つ）
      const status = (e as { status?: number })?.status
      const isRetryable =
        status === undefined || // ネットワーク等
        status === 429 ||
        status === 503 ||
        (status >= 500 && status < 600)
      if (!isRetryable || attempt === MAX_RETRIES - 1) {
        throw e
      }
      const waitMs = Math.min(4000, 1000 * Math.pow(2, attempt)) // 1s → 2s → 4s
      console.warn(
        `[gemini] ${modelName} ${status ?? 'network'}, retrying in ${waitMs}ms (${attempt + 1}/${MAX_RETRIES})`
      )
      await new Promise((r) => setTimeout(r, waitMs))
    }
  }
  throw lastError
}

async function callGeminiWithRetry(prompt: string): Promise<string> {
  try {
    return await tryGeminiModel(PRIMARY_MODEL, prompt)
  } catch (primaryErr) {
    console.warn(
      `[gemini] primary ${PRIMARY_MODEL} exhausted, falling back to ${FALLBACK_MODEL}:`,
      primaryErr
    )
    return await tryGeminiModel(FALLBACK_MODEL, prompt)
  }
}
