// Open-Meteo を使った天気取得
// API キー不要・無料無制限（非商用利用）
// https://open-meteo.com/en/docs

import type { ClothingIndex, WeatherData } from '@/types/fashion'

// WMO Weather interpretation codes
const WMO_DESCRIPTIONS: Record<number, { desc: string; icon: string }> = {
  0: { desc: '快晴', icon: '☀️' },
  1: { desc: 'おおむね晴れ', icon: '🌤' },
  2: { desc: '一部曇り', icon: '⛅' },
  3: { desc: '曇り', icon: '☁️' },
  45: { desc: '霧', icon: '🌫' },
  48: { desc: '濃霧', icon: '🌫' },
  51: { desc: '霧雨', icon: '🌦' },
  53: { desc: '霧雨', icon: '🌦' },
  55: { desc: '濃い霧雨', icon: '🌦' },
  61: { desc: '小雨', icon: '🌧' },
  63: { desc: '雨', icon: '🌧' },
  65: { desc: '強い雨', icon: '🌧' },
  71: { desc: '小雪', icon: '🌨' },
  73: { desc: '雪', icon: '🌨' },
  75: { desc: '大雪', icon: '❄️' },
  77: { desc: 'みぞれ', icon: '🌨' },
  80: { desc: 'にわか雨', icon: '🌦' },
  81: { desc: 'にわか雨', icon: '🌦' },
  82: { desc: '激しいにわか雨', icon: '⛈' },
  85: { desc: 'にわか雪', icon: '🌨' },
  86: { desc: '強いにわか雪', icon: '❄️' },
  95: { desc: '雷雨', icon: '⛈' },
  96: { desc: '雷雨（雹）', icon: '⛈' },
  99: { desc: '激しい雷雨', icon: '⛈' },
}

// 体感温度 → 服装指数（5段階）
// tenki.jp / ウェザーニュース等の一般的仕様を参考にしたマッピング
const CLOTHING_LEVELS: {
  min: number
  max: number
  level: 1 | 2 | 3 | 4 | 5
  label: string
  recommendation: string
  emoji: string
}[] = [
  {
    min: 28,
    max: Infinity,
    level: 5,
    label: '暑い',
    recommendation: 'Tシャツ・ノースリーブで快適。水分補給も忘れずに',
    emoji: '🌴',
  },
  {
    min: 22,
    max: 28,
    level: 4,
    label: '過ごしやすい',
    recommendation: '半袖シャツや薄手のブラウスが活躍。朝晩は1枚羽織りを',
    emoji: '👕',
  },
  {
    min: 16,
    max: 22,
    level: 3,
    label: '肌寒い',
    recommendation: '長袖シャツ＋カーディガンや薄手ジャケットがちょうど良い',
    emoji: '👔',
  },
  {
    min: 8,
    max: 16,
    level: 2,
    label: '寒い',
    recommendation: '厚手のコートやジャケット、中にヒートテックも検討',
    emoji: '🧥',
  },
  {
    min: -Infinity,
    max: 8,
    level: 1,
    label: 'かなり寒い',
    recommendation: 'ダウンコート・マフラー・手袋でしっかり防寒を',
    emoji: '☃️',
  },
]

/**
 * 体感温度から服装指数を計算
 * - score: 0-100（高いほど薄着でOK）
 * - level: 1=極寒 ～ 5=猛暑
 */
export function computeClothingIndex(apparentTemp: number): ClothingIndex {
  // -5℃ → 0, 35℃ → 100 にクランプ
  const score = Math.round(
    Math.max(0, Math.min(100, ((apparentTemp - -5) / (35 - -5)) * 100))
  )

  const level =
    CLOTHING_LEVELS.find((l) => apparentTemp >= l.min && apparentTemp < l.max) ||
    CLOTHING_LEVELS[CLOTHING_LEVELS.length - 1]

  return {
    score,
    level: level.level,
    label: level.label,
    recommendation: level.recommendation,
    emoji: level.emoji,
  }
}

/**
 * 天気を取得（Open-Meteo）。lat/lon 省略時は東京デフォルト。
 */
export async function fetchWeather(
  lat = 35.6895, // 東京
  lon = 139.6917,
  cityHint = '東京'
): Promise<WeatherData | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m` +
      `&timezone=Asia%2FTokyo`

    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (!res.ok) {
      console.error('[weather] fetch failed:', res.status)
      return null
    }
    const data = await res.json()
    const c = data.current
    if (!c) return null

    const wmo = WMO_DESCRIPTIONS[c.weather_code] || { desc: '不明', icon: '🌤' }
    const apparentTemperature = c.apparent_temperature ?? c.temperature_2m
    const clothingIndex = computeClothingIndex(apparentTemperature)

    return {
      temperature: Math.round(c.temperature_2m),
      apparentTemperature: Math.round(apparentTemperature),
      description: wmo.desc,
      icon: wmo.icon,
      humidity: Math.round(c.relative_humidity_2m),
      windSpeed:
        c.wind_speed_10m != null ? Math.round(c.wind_speed_10m * 10) / 10 : undefined,
      city: cityHint,
      clothingIndex,
    }
  } catch (e) {
    console.error('[weather] error:', e)
    return null
  }
}
