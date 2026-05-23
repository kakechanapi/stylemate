'use client'
import { useState } from 'react'
import { ClothingItem } from '@/types/fashion'

interface OutfitSuggestion {
  suggestion: string
  reason: string
  items: string[]
  itemIds: string[]
  layerHint?: string
}

interface Props {
  clothes: ClothingItem[]
  tpo: string
  eventId?: string | null
  onRefresh?: () => void
}

export default function OutfitSuggestionCard({ clothes, tpo, eventId }: Props) {
  const [suggestion, setSuggestion] = useState<OutfitSuggestion | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchSuggestion = async () => {
    setLoading(true)
    try {
      // 天気を取得（位置情報があれば使う）
      const w = await new Promise<unknown>((resolve) => {
        const tryFetch = async (lat?: number, lon?: number) => {
          const url =
            lat !== undefined && lon !== undefined
              ? `/api/weather?lat=${lat}&lon=${lon}`
              : `/api/weather`
          try {
            const r = await fetch(url)
            const d = await r.json()
            resolve(d.error ? null : d)
          } catch {
            resolve(null)
          }
        }
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => tryFetch(pos.coords.latitude, pos.coords.longitude),
            () => tryFetch(),
            { timeout: 5000, maximumAge: 600_000 }
          )
        } else {
          tryFetch()
        }
      })

      const res = await fetch('/api/ai-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clothes, weather: w, tpo, eventId }),
      })
      const data = await res.json()
      setSuggestion(data)
    } catch {
      setSuggestion({
        suggestion: '提案の取得に失敗しました。再試行してください。',
        reason: '',
        items: [],
        itemIds: [],
      })
    } finally {
      setLoading(false)
    }
  }

  if (!suggestion && !loading) {
    return (
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: 24,
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(232,160,191,0.15)',
          border: '1px solid #FFE4F0',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>✨</div>
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 16 }}>
          AI が今日の天気・TPO から最適なコーデを提案します
        </p>
        <button
          onClick={fetchSuggestion}
          style={{
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            color: '#fff',
            borderRadius: 24,
            padding: '12px 28px',
            fontWeight: 700,
            fontSize: '0.95rem',
            boxShadow: '0 4px 12px rgba(232,160,191,0.4)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          コーデを提案してもらう
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: 32,
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(232,160,191,0.15)',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>👗</div>
        <p style={{ color: '#C4779B', fontWeight: 600 }}>AI がコーデを考え中…</p>
        <p style={{ color: '#bbb', fontSize: '0.72rem', marginTop: 6 }}>
          天気・気温・あなたの服を考慮中
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #fff 0%, #FFF5F8 100%)',
        borderRadius: 20,
        padding: 20,
        boxShadow: '0 4px 20px rgba(232,160,191,0.15)',
        border: '1px solid #FFE4F0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: '1.2rem' }}>✨</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#C4779B' }}>
          AI コーデ提案
        </span>
      </div>

      {/* 提案本文 */}
      <p style={{ color: '#333', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: 12 }}>
        {suggestion?.suggestion}
      </p>

      {/* 中身レイヤー（あれば） */}
      {suggestion?.layerHint && (
        <div
          style={{
            background: '#FFF0F6',
            borderLeft: '3px solid #C4779B',
            padding: '8px 12px',
            borderRadius: 6,
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: '0.7rem', color: '#C4779B', fontWeight: 700, marginBottom: 2 }}>
            🧥 中身レイヤー
          </div>
          <p style={{ fontSize: '0.82rem', color: '#666', lineHeight: 1.5, margin: 0 }}>
            {suggestion.layerHint}
          </p>
        </div>
      )}

      {/* 提案の理由 */}
      {suggestion?.reason && (
        <p style={{ fontSize: '0.78rem', color: '#999', lineHeight: 1.5, marginBottom: 14 }}>
          💡 {suggestion.reason}
        </p>
      )}

      {/* 使うアイテム（画像つきカード） */}
      {suggestion?.itemIds && suggestion.itemIds.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.8rem', color: '#999', marginBottom: 8, fontWeight: 600 }}>
            使うアイテム
          </p>
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {suggestion.itemIds.map((id, i) => {
              const item = clothes.find((c) => c.id === id)
              if (!item) return null
              return (
                <div
                  key={id}
                  style={{
                    flexShrink: 0,
                    width: 90,
                    background: '#fff',
                    border: '1px solid #FFE4F0',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      aspectRatio: '1',
                      background: '#FFF0F6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '1.6rem' }}>👗</span>
                    )}
                  </div>
                  <div
                    style={{
                      padding: '6px 4px',
                      fontSize: '0.65rem',
                      color: '#333',
                      fontWeight: 600,
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.name}
                  </div>
                </div>
              )
            })}
          </div>
          {/* AI が ID を返さなかった場合のフォールバック（名前タグ） */}
          {suggestion.items.length > 0 && suggestion.itemIds.length === 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {suggestion.items.map((item, i) => (
                <span
                  key={i}
                  style={{
                    background: '#FFF0F6',
                    color: '#C4779B',
                    borderRadius: 20,
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {/* itemIds 無し・items だけの場合 */}
      {(!suggestion?.itemIds || suggestion.itemIds.length === 0) &&
        suggestion?.items &&
        suggestion.items.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: '0.8rem', color: '#999', marginBottom: 8, fontWeight: 600 }}>
              使うアイテム
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {suggestion.items.map((item, i) => (
                <span
                  key={i}
                  style={{
                    background: '#FFF0F6',
                    color: '#C4779B',
                    borderRadius: 20,
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                  }}
                >
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
          borderRadius: 20,
          padding: 10,
          fontWeight: 700,
          fontSize: '0.88rem',
          cursor: 'pointer',
        }}
      >
        別のコーデを見る 🔄
      </button>
    </div>
  )
}
