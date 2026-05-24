'use client'

const categories: { id: string; label: string; emoji: string }[] = [
  { id: 'all', label: 'すべて', emoji: '👗' },
  { id: 'tops', label: 'トップス', emoji: '👕' },
  { id: 'bottoms', label: 'ボトムス', emoji: '👖' },
  { id: 'outerwear', label: 'アウター', emoji: '🧥' },
  { id: 'shoes', label: 'シューズ', emoji: '👟' },
  { id: 'bag', label: 'バッグ', emoji: '👜' },
  { id: 'accessory', label: 'アクセ', emoji: '💍' },
  { id: 'dress', label: 'ワンピ', emoji: '👗' },
]

interface Props {
  active: string
  onChange: (id: string) => void
}

export default function ClosetFilter({ active, onChange }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 12,
        marginBottom: 16,
      }}
    >
      {categories.map((cat) => {
        const isActive = active === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: 20,
              border: `2px solid ${isActive ? '#E8A0BF' : '#eee'}`,
              background: isActive ? '#FFF0F6' : '#fff',
              color: isActive ? '#C4779B' : '#888',
              fontSize: '0.78rem',
              fontWeight: isActive ? 700 : 400,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            {cat.emoji} {cat.label}
          </button>
        )
      })}
    </div>
  )
}
