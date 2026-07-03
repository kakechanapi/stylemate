// Gemini ベースのコーデ提案
// 入力：天気・TPO・予定タイトル・嗜好（任意）・所有服一覧
// 出力：コーデ提案 + 中身レイヤー + 理由 + 該当アイテムID

import { GoogleGenerativeAI } from '@google/generative-ai'
import { ClothingItem, TPO, WeatherData } from '@/types/fashion'
import { logUsage } from './usage-cost'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * 1案分のコーデ提案
 * 3案提案する場合は OutfitSuggestionsResult.suggestions[] として並ぶ
 */
export interface OutfitSuggestion {
  theme?: string // テーマ名（例：「韓国系クリーンカジュアル」「きれいめオフィス」）。3案提案時に各案を見分ける用
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

/**
 * 3案提案のレスポンス
 * 各案には独自のテーマ名・コーデが含まれる
 * クローゼットが極端に少ない場合は suggestions が 1〜2 案になることもある
 */
export interface OutfitSuggestionsResult {
  suggestions: OutfitSuggestion[]
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

/**
 * 画像 URL を取得して Gemini の inlineData Part に変換
 * - 失敗・タイムアウト時は null を返す（テキスト情報だけで提案させる）
 * - クローゼットが大きいときに全部失敗してもアプリは落ちない
 */
async function fetchImageAsPart(
  url: string,
  timeoutMs = 4000
): Promise<{ inlineData: { data: string; mimeType: string } } | null> {
  if (!url) return null
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
    // 画像のみ受け入れる（HTML エラーページ等を弾く）
    if (!mimeType.startsWith('image/')) return null
    const buf = await res.arrayBuffer()
    // Base64 化
    const data = Buffer.from(buf).toString('base64')
    return { inlineData: { data, mimeType } }
  } catch {
    return null
  }
}

/**
 * クローゼットの服画像を並列フェッチして Gemini に渡せる Parts に変換。
 * - 各画像 4 秒タイムアウト
 * - 成功した分だけ返す（取れなかったものはテキスト情報だけで AI が判断）
 *
 * 戻り値の vision には「画像が取得できた服の id 一覧」も含む。
 * プロンプト側で「以下の N 枚の画像は順番に id1, id2, ... の服です」と
 * 明示することで AI が画像とテキスト情報を紐付けて判断できる。
 */
async function buildVisionParts(
  clothes: ClothingItem[],
  maxImages = 12
) {
  // 画像が無い服はスキップ
  const withImage = clothes.filter((c) => c.image_url)
  // 多すぎる場合は最初の N 件だけ（コスト・レイテンシ対策）
  const slice = withImage.slice(0, maxImages)
  const results = await Promise.all(
    slice.map(async (c) => ({
      cloth: c,
      part: await fetchImageAsPart(c.image_url || ''),
    }))
  )
  const parts: Array<{ inlineData: { data: string; mimeType: string } }> = []
  const ids: string[] = []
  for (const r of results) {
    if (r.part) {
      parts.push(r.part)
      ids.push(r.cloth.id)
    }
  }
  return { parts, ids }
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
): Promise<OutfitSuggestionsResult> {
  // シーン別の文脈付きラベル
  // AI が「単なるカジュアル」ではなく「友達と気楽な日」のような空気感を理解できるよう、
  // 表面ラベル + どんな日かのニュアンスを併記する。
  const tpoLabels: Record<TPO, string> = {
    casual: 'プライベート（友達とカフェ・休日のおでかけ等、ふだん使い。気楽さ＋自分らしさを優先）',
    date: 'デート（好印象を狙いたい日。きれいめ寄り、相手に「素敵だな」と思われる装い）',
    work: '仕事（職場・打ち合わせ。きちんと感、清潔感、TPOを外さない安定感）',
    party: 'お祝い・パーティー（結婚式二次会・誕生日会・飲み会など華やかな場。少し背伸びしてもOK）',
    sport: 'お出かけ・スポーツ（アクティブに動く日。動きやすさ＋それでも見栄えする工夫）',
    formal: 'フォーマル（式典・葬儀・正装の場。失礼にならない・きちんとした装い）',
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

  // 女性ユーザー向け：特有の配慮事項を AI に明示する
  // （透け対策・インナー・アクセサリー・タイツ等）
  const isFemale = me?.gender === '女性'
  const femaleCareText = isFemale
    ? `\n【女性ユーザー向けの追加配慮】
- 透け感（slight/significant）があるトップス・ワンピースは、インナー（キャミソール・チューブトップ・タンクトップ等）が必要 → 提案文で言及するか itemIds に含める
- 白いトップス × 黒いボトムスのような下着が透けやすい組み合わせは、シームレスインナー推奨を suggestion/layerHint で言及
- シンプルな服はアクセサリー・バッグの「差し色」「ワンポイント」で印象UP（クローゼットにアクセサリー・バッグがあれば積極活用）
- スカートやワンピースを使う場合、季節に応じてタイツ・ストッキング・ソックスの提案を suggestion で言及（既存アイテムにあれば itemIds にも入れる）
- ノースリーブ・オフショル系は、肌見せ＝TPO 配慮（仕事・フォーマルでは避ける）
- パフスリーブ・フリル等のフェミニン要素は、好み（嗜好タグ）に合えば積極採用
`
    : ''

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

  // 服一覧サマリ：詳細特徴があれば併記して AI に渡す
  // 「ベージュのリネンVネック半袖 = 涼しい・透ける可能性あり」のような判断ができる
  const clothesSummary = clothes
    .map((c) => {
      const parts = [
        `id="${c.id}"`,
        `名前="${c.name}"`,
        `カテゴリ=${c.category}`,
        `色="${c.color || '不明'}"`,
      ]
      if (c.brand) parts.push(`ブランド="${c.brand}"`)
      if (c.material) parts.push(`素材=${c.material}`)
      if (c.silhouette) parts.push(`シルエット=${c.silhouette}`)
      if (c.pattern) parts.push(`柄=${c.pattern}`)
      if (c.neckline) parts.push(`首元=${c.neckline}`)
      if (c.sleeve_type) parts.push(`袖=${c.sleeve_type}`)
      if (c.length_type) parts.push(`丈=${c.length_type}`)
      if (c.transparency && c.transparency !== 'none') {
        parts.push(`透け感=${c.transparency === 'slight' ? 'やや透ける' : 'かなり透ける'}`)
      }
      if (c.features && c.features.length > 0) parts.push(`特徴=[${c.features.join(',')}]`)
      return `- ${parts.join(' ')}`
    })
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

  // Vision：画像つきの服をフェッチして AI に視覚的にも判断させる
  // 失敗した画像はスキップ（テキスト情報だけで AI が判断）
  const vision = await buildVisionParts(clothes, 12)
  const visionText = vision.ids.length > 0
    ? `\n【画像付き服】これ以降のメッセージに添付される画像は、上記所有服のうち以下の id の服の画像です（順番に対応）：${vision.ids.join(', ')}\n色味・柄・シルエットも判断材料にしてください。`
    : ''

  const prompt = `あなたは経験豊富な日本のファッションスタイリストです。以下の条件に基づき、ユーザーの所有服から最適なコーディネートを提案してください。

【入力情報】
${weatherText}
TPO: ${tpoLabels[context.tpo]}${meText}${femaleCareText}${scheduleText}${styleText}${recentText}${fixedText}${excludedText}

【ユーザーの所有服一覧】
${clothesSummary || '（まだ服が登録されていません）'}${closetStatsText}${missingHintText}${visionText}

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

【3案提案】
ユーザーに「これじゃない」感を持たせないため、同じ条件で系統やパターンの異なる **3案** を提案してください。
- 例：A=きれいめ・B=カジュアル寄り・C=羽織りで温度調整 など系統を分ける
- 同じアイテムを全案で使い回すのは OK（ベースは同じ服でも組み合わせや系統で変化を出す）
- 各案には短い「theme」（テーマ名、例：「韓国系クリーンカジュアル」「品よくオフィス」「休日リラックス」）を付けて見分けやすく

【返答形式：必ず JSON のみ、前後に余計なテキスト不要】
{
  "suggestions": [
    {
      "theme": "テーマ名（10文字以内が理想・例：『韓国系クリーンカジュアル』）",
      "suggestion": "コーデの説明（2〜3文、フレンドリーなトーンで）",
      "reason": "なぜこの提案？（気温・TPO・レイヤーの根拠を簡潔に1〜2文）",
      "items": ["使う服の名前1", "使う服の名前2", ...],
      "itemIds": ["使う服のID1", "使う服のID2", ...],
      "layerHint": "中身レイヤーの補足（itemIds と乖離しないこと。不要なら空文字列）"
    },
    { /* 2案目：上記と系統を変える */ },
    { /* 3案目：上記2案と系統を変える */ }
  ]
}

服が極端に少なく3案作れない場合は suggestions を 1〜2 案にしてもOK（全案で同じアイテムだけ使い回すのは避ける）。`

  try {
    const text = await callGeminiWithRetry(prompt, vision.parts)
    // 使用ログ（成功時のみ。失敗時はリトライ済で課金は変動する想定）
    // void は Vercel で実行保証がないため await（logUsage は内部で例外を握るので安全）
    await logUsage({
      service: 'gemini_outfit_suggest',
      operation: 'generateContent',
      tokensIn: Math.ceil(prompt.length / 4), // 概算（1トークン≒4文字）
      tokensOut: Math.ceil(text.length / 4),
    })
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      // 新形式（suggestions 配列）を期待しつつ、旧形式（単一）も互換維持
      if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
        const suggestions: OutfitSuggestion[] = parsed.suggestions
          .map((s: Record<string, unknown>): OutfitSuggestion => ({
            theme: typeof s.theme === 'string' ? s.theme : undefined,
            suggestion: typeof s.suggestion === 'string' ? s.suggestion : '今日のコーデを考え中…',
            reason: typeof s.reason === 'string' ? s.reason : '',
            items: Array.isArray(s.items) ? s.items as string[] : [],
            itemIds: Array.isArray(s.itemIds) ? s.itemIds as string[] : [],
            layerHint: typeof s.layerHint === 'string' && s.layerHint.length > 0 ? s.layerHint : undefined,
          }))
          // itemIds 空の案は表示しても意味がないので除外
          .filter((s: OutfitSuggestion) => s.itemIds.length > 0)
        if (suggestions.length > 0) {
          return { suggestions, missingCategories }
        }
      }
      // フォールバック：旧形式の単一提案
      if (parsed.suggestion || Array.isArray(parsed.itemIds)) {
        return {
          suggestions: [
            {
              suggestion: parsed.suggestion || '今日のコーデを考え中…',
              reason: parsed.reason || '',
              items: Array.isArray(parsed.items) ? parsed.items : [],
              itemIds: Array.isArray(parsed.itemIds) ? parsed.itemIds : [],
              layerHint: parsed.layerHint || undefined,
            },
          ],
          missingCategories,
        }
      }
    }
  } catch (e) {
    console.error('[lib/gemini] all retries + fallback failed:', e)
  }

  return {
    suggestions: [
      {
        suggestion:
          clothes.length === 0
            ? 'まずクローゼットに服を登録してみましょう！'
            : 'AI 提案に一時的に失敗しました。再試行してください。',
        reason: '',
        items: [],
        itemIds: [],
      },
    ],
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

async function tryGeminiModel(
  modelName: string,
  prompt: string,
  imageParts: Array<{ inlineData: { data: string; mimeType: string } }> = []
): Promise<string> {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      // 画像があれば multimodal、なければ純粋テキスト
      const result = imageParts.length > 0
        ? await model.generateContent([prompt, ...imageParts])
        : await model.generateContent(prompt)
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

async function callGeminiWithRetry(
  prompt: string,
  imageParts: Array<{ inlineData: { data: string; mimeType: string } }> = []
): Promise<string> {
  try {
    return await tryGeminiModel(PRIMARY_MODEL, prompt, imageParts)
  } catch (primaryErr) {
    console.warn(
      `[gemini] primary ${PRIMARY_MODEL} exhausted, falling back to ${FALLBACK_MODEL}:`,
      primaryErr
    )
    return await tryGeminiModel(FALLBACK_MODEL, prompt, imageParts)
  }
}
