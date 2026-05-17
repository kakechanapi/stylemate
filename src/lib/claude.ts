import Anthropic from '@anthropic-ai/sdk'
import { ClothingItem, TPO, WeatherData } from '@/types/fashion'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `あなたはファッションスタイリストです。以下の条件でコーディネートを提案してください。

${weatherText}
TPO: ${tpoLabels[tpo]}

クローゼットにある服:
${clothesSummary || '（まだ服が登録されていません）'}

返答形式（JSON）:
{
  "suggestion": "コーデの説明（2〜3文、フレンドリーなトーンで）",
  "items": ["おすすめアイテム1", "おすすめアイテム2", ...]
}

服が少ない場合でも、ある服を活かした提案をしてください。`,
      },
    ],
  })

  try {
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
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
