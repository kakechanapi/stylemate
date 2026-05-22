'use client'
import { useRouter } from 'next/navigation'
import type { ClothingItem } from '@/types/fashion'

const categoryEmoji: Record<string, string> = {
  tops: '👕', bottoms: '👖', outerwear: '🧥', shoes: '👟',
  bag: '👜', accessory: '💍', dress: '👗', other: '🎁',
}

export default function TryonClothingPicker({
  friendId,
  clothes,
}: {
  friendId: string
  clothes: ClothingItem[]
}) {
  const router = useRouter()

  const handlePick = (clothing: ClothingItem) => {
    router.push(`/tryon/${friendId}/generate?clothingId=${clothing.id}`)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {clothes.map((c) => (
        <button
          key={c.id}
          onClick={() => handlePick(c)}
          style={{
            background: '#fff',
            border: '2px solid #FFE4F0',
            borderRadius: 16,
            overflow: 'hidden',
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
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
            {c.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.image_url}
                alt={c.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '2.5rem' }}>{categoryEmoji[c.category]}</span>
            )}
          </div>
          <div style={{ padding: 10 }}>
            <p
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#333',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {c.name}
            </p>
            {c.brand && (
              <p style={{ fontSize: '0.7rem', color: '#999', marginTop: 2 }}>{c.brand}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
