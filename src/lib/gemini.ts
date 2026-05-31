// Gemini ベースのコーデ提案
// 入力：天気・TPO・予定タイトル・嗜好（任意）・所有服一覧
// 出力：コーデ提案 + 中身レイヤー + 理由 + 該当アイテムID

import { GoogleGenerativeAI } from '@google/generative-ai'
import { ClothingItem, TPO, WeatherData } from '@/types/fashion'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface OutfitSuggestion {
  suggestion: string // メイン提案テキスト（2〜3文、フレンドリー）
  reason: string // なぜこの提案？
  items: string[] // クローゼットアイテム名（人間が読む用）
  itemIds: string[] // クローゼットアイテムID（リンク用）
  layerHint?: string // 中身レイヤー提案（任意）
}

export interface SuggestionContext {
  weather: WeatherData | null
  tpo: TPO
  scheduleTitle?: string
  styleTags?: string[]
  recentClothIds?: string[]
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

  const styleText =
    context.styleTags && context.styleTags.length > 0
      ? `\nユーザーの嗜好：${context.styleTags.join('、')}`
      : ''

  const recentText =
    context.recentClothIds && context.recentClothIds.length > 0
      ? `\n直近着用した服ID（被り回避：これらは避ける）：${context.recentClothIds.join(', ')}`
      : ''

  const clothesSummary = clothes
    .map(
      (c) =>
        `- id="${c.id}" 名前="${c.name}" カテゴリ=${c.category} ブランド="${c.brand || '不明'}" 色="${c.color || '不明'}"`
    )
    .join('\n')

  const prompt = `あなたは経験豊富な日本のファッションスタイリストです。以下の条件に基づき、ユーザーの所有服から最適なコーディネートを提案してください。

【入力情報】
${weatherText}
TPO: ${tpoLabels[context.tpo]}${scheduleText}${styleText}${recentText}

【ユーザーの所有服一覧】
${clothesSummary || '（まだ服が登録されていません）'}

【提案の指針】
1. 体感温度と服装指数（提示があれば）に応じてレイヤー構成を選ぶ
   - 服装指数 80以上 / 28℃以上: トップス1枚 + ボトムス、涼しい素材
   - 服装指数 60〜80 / 22〜28℃: 半袖中心、朝晩用の薄手羽織りも検討
   - 服装指数 40〜60 / 16〜22℃: 長袖 + 薄手カーディガン or ジャケット
   - 服装指数 20〜40 / 8〜16℃: 厚手アウター、中にヒートテック検討
   - 服装指数 20以下 / 8℃以下: ダウン・マフラー等しっかり防寒
2. TPO・予定に合わせる（デート→きれいめ、ピクニック→カジュアル等）
3. 被り回避指定があれば、その服IDは絶対に使わない
4. ユーザーの嗜好（系統）を尊重する
5. 風速が強い時（5m/s以上）は羽織りものを優先、雨/雪なら撥水素材も提案に含める

【返答形式：必ず JSON のみ、前後に余計なテキスト不要】
{
  "suggestion": "コーデの説明（2〜3文、フレンドリーなトーンで）",
  "reason": "なぜこの提案？（気温・TPO・レイヤーの根拠を簡潔に1〜2文）",
  "items": ["使う服の名前1", "使う服の名前2"],
  "itemIds": ["使う服のID1", "使う服のID2"],
  "layerHint": "中身レイヤーの提案（必要な時のみ、不要なら空文字列）"
}

服が少ない場合でも、ある服を活かした提案をしてください。`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        suggestion: parsed.suggestion || '今日のコーデを考え中…',
        reason: parsed.reason || '',
        items: Array.isArray(parsed.items) ? parsed.items : [],
        itemIds: Array.isArray(parsed.itemIds) ? parsed.itemIds : [],
        layerHint: parsed.layerHint || undefined,
      }
    }
  } catch (e) {
    console.error('[lib/gemini] error:', e)
  }

  return {
    suggestion:
      clothes.length === 0
        ? 'まずクローゼットに服を登録してみましょう！'
        : 'AI 提案に一時的に失敗しました。再試行してください。',
    reason: '',
    items: [],
    itemIds: [],
  }
}
