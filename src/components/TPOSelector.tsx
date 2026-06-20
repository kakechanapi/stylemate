'use client'

/**
 * シーンセレクター（旧 TPOSelector）
 * 6つの利用シーンをカードグリッドで選ばせる UI。
 * AI コーデ提案の「目的別」を入り口でハッキリさせるのが狙い。
 *
 * 内部値（id）は既存実装と互換のため変えない：
 * 'casual' | 'date' | 'work' | 'party' | 'sport' | 'formal'
 */

/** id → 表示ラベル（旧 TPO ラベルから、より直感的な表現に） */
export const SCENE_LABEL: Record<string, string> = {
  casual: 'プライベート',
  date: 'デート',
  work: '仕事',
  party: 'お祝い・パーティー',
  sport: 'お出かけ・スポーツ',
  formal: 'フォーマル',
}

const scenes: { id: string; label: string; emoji: string; tagline: string }[] = [
  { id: 'casual', label: 'プライベート', emoji: '😊', tagline: 'ふだん使い' },
  { id: 'work', label: '仕事', emoji: '💼', tagline: 'きちんと感' },
  { id: 'date', label: 'デート', emoji: '💕', tagline: '好印象' },
  { id: 'party', label: 'お祝い・パーティー', emoji: '🎉', tagline: '華やかに' },
  { id: 'sport', label: 'お出かけ・スポーツ', emoji: '🏃', tagline: '動きやすく' },
  { id: 'formal', label: 'フォーマル', emoji: '✨', tagline: '式・式典' },
]

interface Props {
  selected: string
  onChange: (sceneId: string) => void
}

export default function TPOSelector({ selected, onChange }: Props) {
  return (
    <div>
      <div
        style={{
          fontSize: '0.8rem',
          color: '#999',
          marginBottom: 10,
          fontWeight: 700,
          paddingLeft: 4,
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
        }}
      >
        <span>🎯 今日のシーンは？</span>
        <span style={{ fontSize: '0.66rem', color: '#bbb', fontWeight: 500 }}>
          選んだ目的別にコーデを提案します
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        {scenes.map((s) => {
          const active = selected === s.id
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '10px 6px',
                borderRadius: 14,
                border: `2px solid ${active ? '#C4779B' : '#FFE4F0'}`,
                background: active
                  ? 'linear-gradient(135deg, #FFF0F6, #FFE4F0)'
                  : '#fff',
                color: active ? '#C4779B' : '#666',
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: active
                  ? '0 4px 12px rgba(196,121,155,0.25)'
                  : '0 1px 3px rgba(0,0,0,0.04)',
                transform: active ? 'translateY(-1px)' : 'none',
              }}
              aria-pressed={active}
            >
              <span style={{ fontSize: '1.5rem', lineHeight: 1.1 }}>{s.emoji}</span>
              <span style={{ fontSize: '0.74rem', marginTop: 2 }}>{s.label}</span>
              <span
                style={{
                  fontSize: '0.6rem',
                  color: active ? '#C4779B' : '#bbb',
                  fontWeight: 500,
                  opacity: 0.85,
                }}
              >
                {s.tagline}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
