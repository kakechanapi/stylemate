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

  const weatherText = context.weather
    ? `今日の天気：${context.weather.description}、気温${context.weather.temperature}℃、湿度${context.weather.humidity}%`
    : '天気情報なし'

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
1. 気温に応じて適切なレイヤー構成を選ぶ
   - 25℃以上: トップス1枚 + ボトムス、または涼しい素材
   - 18〜24℃: トップス + 軽い羽織りを検討
   - 10〜17℃: トップス + アウター必須
   - 9℃以下: 中にヒートテック等のインナー + アウター
2. TPO・予定に合わせる（デート→きれいめ、ピクニック→カジュアル等）
3. 被り回避指定があれば、その服IDは絶対に使わない
4. ユーザーの嗜好（系統）を尊重する

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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
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
