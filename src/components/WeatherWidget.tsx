'use client'
import { useEffect, useState } from 'react'
import type { ClothingIndex } from '@/types/fashion'

interface Weather {
  temperature: number
  description: string
  icon: string
  humidity: number
  city: string
  apparentTemperature?: number
  windSpeed?: number
  clothingIndex?: ClothingIndex
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

  const ci = weather.clothingIndex

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #BAD7E9, #E8A0BF)',
        borderRadius: 16,
        padding: 16,
        color: '#fff',
      }}
    >
      {/* 場所表示（天気の妥当性を視認） */}
      {weather.city && (
        <div
          style={{
            fontSize: '0.72rem',
            opacity: 0.9,
            fontWeight: 600,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          📍 {weather.city}
        </div>
      )}

      {/* 上段：天気 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '2.4rem' }}>{weather.icon}</span>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1 }}>
              {weather.temperature}°
              {weather.apparentTemperature !== undefined &&
                weather.apparentTemperature !== weather.temperature && (
                  <span style={{ fontSize: '0.7rem', opacity: 0.85, marginLeft: 6 }}>
                    体感 {weather.apparentTemperature}°
                  </span>
                )}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{weather.description}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.7rem', opacity: 0.85, lineHeight: 1.6 }}>
          <div>湿度 {weather.humidity}%</div>
          {weather.windSpeed !== undefined && <div>風 {weather.windSpeed}m/s</div>}
        </div>
      </div>

      {/* 下段：服装指数 */}
      {ci && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.35)',
          }}
        >
          {/* スコア + ラベル */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{ci.emoji}</span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '0.7rem',
                  opacity: 0.9,
                  letterSpacing: 1,
                  fontWeight: 700,
                }}
              >
                服装指数
              </div>
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  lineHeight: 1.2,
                  marginTop: 2,
                }}
              >
                {ci.label}
              </div>
            </div>
            <div
              style={{
                textAlign: 'right',
                fontSize: '1.6rem',
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {ci.score}
              <span style={{ fontSize: '0.6rem', opacity: 0.8, marginLeft: 2 }}>/100</span>
            </div>
          </div>

          {/* 5段階ドット */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              marginBottom: 8,
            }}
          >
            {[1, 2, 3, 4, 5].map((lv) => (
              <div
                key={lv}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  background:
                    lv <= ci.level
                      ? 'rgba(255,255,255,0.95)'
                      : 'rgba(255,255,255,0.28)',
                }}
              />
            ))}
          </div>

          {/* 推奨 */}
          <p
            style={{
              fontSize: '0.78rem',
              lineHeight: 1.5,
              opacity: 0.95,
            }}
          >
            {ci.recommendation}
          </p>
        </div>
      )}
    </div>
  )
}
