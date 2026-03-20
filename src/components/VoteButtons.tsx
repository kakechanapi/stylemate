'use client'

import { useState } from 'react'
import { supabase } from '@/src/lib/supabase'

export default function VoteButtons({ predictionId }: { predictionId: string }) {
  const [voted, setVoted] = useState<'yes' | 'no' | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleVote(choice: 'yes' | 'no') {
    if (voted || loading) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('投票するにはログインが必要です')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('user_predictions').insert({
      prediction_id: predictionId,
      user_id: user.id,
      choice,
      points_wagered: 10,
    })

    if (error) {
      if (error.code === '23505') {
        alert('この予測にはすでに投票しています')
      } else {
        alert('投票に失敗しました: ' + error.message)
      }
    } else {
      setVoted(choice)
    }
    setLoading(false)
  }

  if (voted) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '1rem',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)',
        color: voted === 'yes' ? 'var(--yes-color)' : 'var(--no-color)',
        fontWeight: 700,
        fontSize: '1rem',
      }}>
        {voted === 'yes' ? '✅ YES に投票しました！' : '❌ NO に投票しました！'}
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '4px' }}>
          結果が確定したらポイントが付与されます
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '0.75rem' }}>
      <button
        onClick={() => handleVote('yes')}
        disabled={loading}
        style={{
          flex: 1,
          padding: '14px',
          borderRadius: 'var(--radius-sm)',
          background: loading ? '#f3f4f6' : 'var(--yes-color)',
          color: '#fff',
          fontWeight: 700,
          fontSize: '1rem',
          opacity: loading ? 0.6 : 1,
          transition: 'opacity 0.15s, transform 0.1s',
        }}
      >
        ✅ YES
      </button>
      <button
        onClick={() => handleVote('no')}
        disabled={loading}
        style={{
          flex: 1,
          padding: '14px',
          borderRadius: 'var(--radius-sm)',
          background: loading ? '#f3f4f6' : 'var(--no-color)',
          color: '#fff',
          fontWeight: 700,
          fontSize: '1rem',
          opacity: loading ? 0.6 : 1,
          transition: 'opacity 0.15s, transform 0.1s',
        }}
      >
        ❌ NO
      </button>
    </div>
  )
}
