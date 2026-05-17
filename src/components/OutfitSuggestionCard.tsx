'use client'
import { useState } from 'react'
import { ClothingItem } from '@/types/fashion'

interface OutfitSuggestion {
  suggestion: string
  items: string[]
}

interface Props {
  clothes: ClothingItem[]
  tpo: string
  onRefresh: () => void
}

export default function OutfitSuggestionCard({ clothes, tpo, onRefresh }: Props) {
  const [suggestion, setSuggestion] = useState<OutfitSuggestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [weather, setWeather] = useState<unknown>(null)

  const fetchSuggestion = async () => {
    setLoading(true)
    try {
      const weatherRes = await fetch('/api/weather')
      const weatherData = await weatherRes.json()
      const w = weatherData.error ? null : weatherData
      setWeather(w)

      const res = await fetch('/api/ai-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clothes, weather: w, tpo }),
      })
      const data = await res.json()
      setSuggestion(data)
    } catch {
      setSuggestion({ suggestion: '提案の取得に失敗しました。再試行してください。', items: [] })
    } finally {
      setLoading(false)
    }
  }

  // Suppress unused variable warning
  void weather
  void onRefresh

  if (!suggestion && !loading) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '24px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(232,160,191,0.15)',
        border: '1px solid #FFE4F0',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✨</div>
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '16px' }}>
          AIがあなたのコーデを提案します
        </p>
        <button
          onClick={fetchSuggestion}
          style={{
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            color: '#fff',
            borderRadius: '24px',
            padding: '12px 28px',
            fontWeight: 700,
            fontSize: '0.95rem',
            boxShadow: '0 4px 12px rgba(232,160,191,0.4)',
          }}
        >
          コーデを提案してもらう
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '32px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(232,160,191,0.15)',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👗</div>
        <p style={{ color: '#C4779B', fontWeight: 600 }}>AIがコーデを考え中...</p>
      </div>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fff 0%, #FFF5F8 100%)',
      borderRadius: '20px',
      padding: '20px',
      boxShadow: '0 4px 20px rgba(232,160,191,0.15)',
      border: '1px solid #FFE4F0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '1.2rem' }}>✨</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#C4779B' }}>AIコーデ提案</span>
      </div>
      <p style={{ color: '#333', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '16px' }}>
        {suggestion?.suggestion}
      </p>
      {suggestion?.items && suggestion.items.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '0.8rem', color: '#999', marginBottom: '8px', fontWeight: 600 }}>おすすめアイテム</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {suggestion.items.map((item, i) => (
              <span key={i} style={{
                background: '#FFF0F6',
                color: '#C4779B',
                borderRadius: '20px',
                padding: '4px 10px',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={fetchSuggestion}
        style={{
          width: '100%',
          background: '#fff',
          color: '#C4779B',
          border: '2px solid #E8A0BF',
          borderRadius: '20px',
          padding: '10px',
          fontWeight: 700,
          fontSize: '0.88rem',
        }}
      >
        別のコーデを見る 🔄
      </button>
    </div>
  )
}
