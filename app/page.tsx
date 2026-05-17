'use client'
import { useState } from 'react'
import WeatherWidget from '@/components/WeatherWidget'
import TPOSelector from '@/components/TPOSelector'
import OutfitSuggestionCard from '@/components/OutfitSuggestionCard'
import { ClothingItem } from '@/types/fashion'

// Mock data for demo (replace with Supabase calls when auth is set up)
const mockClothes: ClothingItem[] = []

export default function HomePage() {
  const [tpo, setTpo] = useState('casual')
  const [clothes] = useState<ClothingItem[]>(mockClothes)
  const today = new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: '#bbb' }}>{today}</p>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333' }}>
            今日のコーデ 👗
          </h1>
        </div>
        <div style={{
          width: '40px', height: '40px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #E8A0BF, #BAD7E9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem',
        }}>
          🙂
        </div>
      </div>

      {/* Weather */}
      <div style={{ marginBottom: '16px' }}>
        <WeatherWidget />
      </div>

      {/* TPO */}
      <div style={{ marginBottom: '20px' }}>
        <TPOSelector selected={tpo} onChange={setTpo} />
      </div>

      {/* AI Outfit Suggestion */}
      <OutfitSuggestionCard clothes={clothes} tpo={tpo} onRefresh={() => {}} />

      {/* Quick actions */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <a href="/register" style={{
          flex: 1,
          background: '#fff',
          border: '2px solid #E8A0BF',
          borderRadius: '16px',
          padding: '14px',
          textAlign: 'center',
          color: '#C4779B',
          fontWeight: 700,
          fontSize: '0.88rem',
        }}>
          ＋ 服を登録する
        </a>
        <a href="/closet" style={{
          flex: 1,
          background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
          borderRadius: '16px',
          padding: '14px',
          textAlign: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.88rem',
        }}>
          クローゼット
        </a>
      </div>

      {/* Tip banner */}
      <div style={{
        marginTop: '20px',
        background: '#FFF0F6',
        borderRadius: '16px',
        padding: '14px',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '1.4rem' }}>💡</span>
        <div>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#C4779B', marginBottom: '4px' }}>使い方ヒント</p>
          <p style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.6 }}>
            まず「服を登録する」から服を追加してみよう！バーコードスキャンやブランド名検索で簡単に登録できます。
          </p>
        </div>
      </div>
    </div>
  )
}
