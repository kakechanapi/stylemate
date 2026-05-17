import { GoogleGenerativeAI } from '@google/generative-ai'
import { ClothingItem, TPO, WeatherData } from '@/types/fashion'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function generateOutfitSuggestion(
  clothes: ClothingItem[],
  weather: WeatherData | null,
  tpo: TPO
): Promise<{ suggestion: string; items: string[] }> {
  const tpoLabels: Record<TPO, string> = {
    casual: 'カジュアル',
    date: 'デート',
    work: '仕事・会議',
    party: 'パーティー',
    sport: 'スポーツ・アウトドア',
    formal: 'フォーマル',
  }

  const weatherText = weather
    ? `今日の天気：${weather.description}、気温${weather.temperature}℃、湿度${weather.humidity}%`
    : '天気情報なし'

  const clothesSummary = clothes
    .map(c => `・${c.name}（${c.brand || 'ブランド不明'}、${c.category}、色:${c.color || '不明'}）`)
    .join('\n')

  const prompt = `あなたはファッションスタイリストです。以下の条件でコーディネートを提案してください。

${weatherText}
TPO: ${tpoLabels[tpo]}

クローゼットにある服:
${clothesSummary || '（まだ服が登録されていません）'}

返答形式（JSONのみ、前後に余計なテキスト不要）:
{
  "suggestion": "コーデの説明（2〜3文、フレンドリーなトーンで）",
  "items": ["おすすめアイテム1", "おすすめアイテム2"]
}

服が少ない場合でも、ある服を活かした提案をしてください。`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // fall through to default
  }

  return {
    suggestion: '今日のコーデを考え中... まずクローゼットに服を登録してみましょう！',
    items: [],
  }
}
