'use client'

const tpoOptions = [
  { id: 'casual', label: 'カジュアル', emoji: '😊' },
  { id: 'date', label: 'デート', emoji: '💕' },
  { id: 'work', label: '仕事', emoji: '💼' },
  { id: 'party', label: 'パーティー', emoji: '🎉' },
  { id: 'sport', label: 'アウトドア', emoji: '🏃' },
  { id: 'formal', label: 'フォーマル', emoji: '✨' },
]

interface Props {
  selected: string
  onChange: (tpo: string) => void
}

export default function TPOSelector({ selected, onChange }: Props) {
  return (
    <div>
      <p style={{ fontSize: '0.8rem', color: '#999', marginBottom: '8px', fontWeight: 600 }}>今日のシーンは？</p>
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {tpoOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              padding: '8px 12px',
              borderRadius: '12px',
              border: `2px solid ${selected === opt.id ? '#E8A0BF' : '#eee'}`,
              background: selected === opt.id ? '#FFF0F6' : '#fff',
              color: selected === opt.id ? '#C4779B' : '#666',
              fontSize: '0.7rem',
              fontWeight: selected === opt.id ? 700 : 400,
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: '1.3rem' }}>{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
