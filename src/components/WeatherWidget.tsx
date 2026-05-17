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

  useEffect(() => {
    fetch('/api/weather').then(r => r.json()).then(d => {
      if (!d.error) setWeather(d)
    })
  }, [])

  const getOutfitHint = (temp: number) => {
    if (temp >= 28) return '暑い！薄着でOK ☀️'
    if (temp >= 22) return '過ごしやすい気温 🌤'
    if (temp >= 16) return '羽織りもの持って 🌥'
    if (temp >= 10) return 'コート必須です 🧥'
    return '防寒バッチリで ❄️'
  }

  if (!weather) return (
    <div style={{
      background: 'linear-gradient(135deg, #BAD7E9, #E8A0BF)',
      borderRadius: '16px',
      padding: '16px',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <span style={{ fontSize: '2rem' }}>🌤</span>
      <div>
        <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>天気を取得中...</div>
      </div>
    </div>
  )

  return (
    <div style={{
      background: 'linear-gradient(135deg, #BAD7E9, #E8A0BF)',
      borderRadius: '16px',
      padding: '16px',
      color: '#fff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
            alt={weather.description}
            style={{ width: '48px', height: '48px' }}
          />
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1 }}>{weather.temperature}°</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{weather.description}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{getOutfitHint(weather.temperature)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>湿度 {weather.humidity}%</div>
        </div>
      </div>
    </div>
  )
}
