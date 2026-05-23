// Open-Meteo を使った天気取得
// API キー不要・無料無制限（非商用利用）
// https://open-meteo.com/en/docs

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

export interface WeatherInfo {
  temperature: number
  description: string
  icon: string
  humidity: number
  city: string
}

/**
 * 天気を取得（Open-Meteo）。lat/lon 省略時は東京デフォルト。
 */
export async function fetchWeather(
  lat = 35.6895, // 東京
  lon = 139.6917,
  cityHint = '東京'
): Promise<WeatherInfo | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,weather_code` +
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
    return {
      temperature: Math.round(c.temperature_2m),
      description: wmo.desc,
      icon: wmo.icon,
      humidity: Math.round(c.relative_humidity_2m),
      city: cityHint,
    }
  } catch (e) {
    console.error('[weather] error:', e)
    return null
  }
}
