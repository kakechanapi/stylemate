'use client'
import { useEffect, useState } from 'react'

interface Weather {
  temperature: number
  description: string
  icon: string
  humidity: number
  city: string
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadWeather = async (lat?: number, lon?: number) => {
      const url =
        lat !== undefined && lon !== undefined
          ? `/api/weather?lat=${lat}&lon=${lon}`
          : `/api/weather`
      try {
        const res = await fetch(url)
        const d = await res.json()
        if (!d.error) setWeather(d)
      } finally {
        setLoading(false)
      }
    }

    // 位置情報があれば使う、なければ東京デフォルト
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => loadWeather(pos.coords.latitude, pos.coords.longitude),
        () => loadWeather(), // 拒否されたら東京
        { timeout: 5000, maximumAge: 600_000 }
      )
    } else {
      loadWeather()
    }
  }, [])

  const getOutfitHint = (temp: number) => {
    if (temp >= 28) return '暑い！薄着でOK'
    if (temp >= 22) return '過ごしやすい'
    if (temp >= 16) return '羽織りもの持って'
    if (temp >= 10) return 'コート必須'
    return '防寒バッチリで'
  }

  if (loading || !weather) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #BAD7E9, #E8A0BF)',
          borderRadius: 16,
          padding: 16,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontSize: '2rem' }}>🌤</span>
        <div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>天気を取得中...</div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #BAD7E9, #E8A0BF)',
        borderRadius: 16,
        padding: 16,
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '2.4rem' }}>{weather.icon}</span>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1 }}>
              {weather.temperature}°
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{weather.description}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {getOutfitHint(weather.temperature)}
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>湿度 {weather.humidity}%</div>
        </div>
      </div>
    </div>
  )
}
