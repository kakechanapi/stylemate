'use client'
import { useState, useTransition } from 'react'
import { ClothingItem } from '@/types/fashion'
import { deleteClothingAction } from '@/app/closet/actions'

const categoryEmoji: Record<string, string> = {
  tops: '👕', bottoms: '👖', outerwear: '🧥', shoes: '👟',
  bag: '👜', accessory: '💍', dress: '👗', other: '🎁',
}

interface Props {
  item: ClothingItem
}

export default function ClothingCard({ item }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    startTransition(async () => {
      await deleteClothingAction(item.id)
    })
  }

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(232,160,191,0.12)',
        border: '1px solid #FFE4F0',
        position: 'relative',
        opacity: pending ? 0.4 : 1,
      }}
    >
      {/* 削除ボタン */}
      <button
        onClick={handleDelete}
        disabled={pending}
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: 'none',
          background: confirming ? '#d63384' : 'rgba(0,0,0,0.45)',
          color: '#fff',
          fontSize: '0.7rem',
          fontWeight: 700,
          cursor: 'pointer',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label={confirming ? 'もう一度押して削除' : '削除'}
        title={confirming ? 'もう一度押して削除' : '削除'}
      >
        {confirming ? '?' : '×'}
      </button>

      <div
        style={{
          aspectRatio: '1',
          background: item.image_url ? 'transparent' : '#FFF0F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: '2.5rem' }}>{categoryEmoji[item.category] || '👗'}</span>
        )}
      </div>
      <div style={{ padding: 10 }}>
        <p
          style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#333',
            marginBottom: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </p>
        {item.brand && <p style={{ fontSize: '0.72rem', color: '#999' }}>{item.brand}</p>}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              background: '#FFF0F6',
              color: '#C4779B',
              borderRadius: 8,
              padding: '2px 6px',
            }}
          >
            {categoryEmoji[item.category]} {item.category}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#bbb' }}>{item.wear_count}回着用</span>
        </div>
      </div>
    </div>
  )
}
