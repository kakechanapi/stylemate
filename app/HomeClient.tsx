'use client'
import { useState } from 'react'
import Link from 'next/link'
import WeatherWidget from '@/components/WeatherWidget'
import TPOSelector from '@/components/TPOSelector'
import OutfitSuggestionCard from '@/components/OutfitSuggestionCard'
import { ClothingItem } from '@/types/fashion'

interface Props {
  clothes: ClothingItem[]
  userEmail: string | null
}

export default function HomeClient({ clothes, userEmail }: Props) {
  const [tpo, setTpo] = useState('casual')
  const today = new Date().toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  const isEmptyCloset = clothes.length === 0

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div>
          <p style={{ fontSize: '0.8rem', color: '#bbb' }}>{today}</p>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333' }}>今日のコーデ 👗</h1>
        </div>
        <Link
          href="/my"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E8A0BF, #BAD7E9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            color: '#fff',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          {(userEmail?.[0] || '?').toUpperCase()}
        </Link>
      </div>

      {/* Weather */}
      <div style={{ marginBottom: 16 }}>
        <WeatherWidget />
      </div>

      {/* TPO */}
      <div style={{ marginBottom: 20 }}>
        <TPOSelector selected={tpo} onChange={setTpo} />
      </div>

      {/* AI Outfit Suggestion or empty state */}
      {isEmptyCloset ? (
        <div
          style={{
            background: '#fff',
            border: '2px dashed #F5C6D8',
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>👗</div>
          <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: 16, lineHeight: 1.6 }}>
            まずクローゼットに服を登録しましょう。
            <br />
            登録した服から AI がコーデを提案します。
          </p>
          <Link
            href="/register"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
              color: '#fff',
              borderRadius: 24,
              padding: '12px 28px',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
            }}
          >
            服を登録する
          </Link>
        </div>
      ) : (
        <OutfitSuggestionCard clothes={clothes} tpo={tpo} onRefresh={() => {}} />
      )}

      {/* Quick actions */}
      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        <Link
          href="/register"
          style={{
            flex: 1,
            background: '#fff',
            border: '2px solid #E8A0BF',
            borderRadius: 16,
            padding: 14,
            textAlign: 'center',
            color: '#C4779B',
            fontWeight: 700,
            fontSize: '0.88rem',
            textDecoration: 'none',
          }}
        >
          ＋ 服を登録する
        </Link>
        <Link
          href="/closet"
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            borderRadius: 16,
            padding: 14,
            textAlign: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.88rem',
            textDecoration: 'none',
          }}
        >
          クローゼット ({clothes.length})
        </Link>
      </div>
    </div>
  )
}
