'use client'
import { useState, useRef, useTransition } from 'react'
import { ClothingItem } from '@/types/fashion'
import { deleteClothingAction } from '@/app/closet/actions'

const categoryEmoji: Record<string, string> = {
  tops: '👕', bottoms: '👖', outerwear: '🧥', shoes: '👟',
  bag: '👜', accessory: '💍', dress: '👗', other: '🎁',
}

interface Props {
  item: ClothingItem
}

const LONG_PRESS_MS = 500

export default function ClothingCard({ item }: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const [pending, startTransition] = useTransition()
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)

  const startLongPress = () => {
    longPressed.current = false
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true
      setShowMenu(true)
      // 触覚フィードバック（対応端末のみ）
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40)
    }, LONG_PRESS_MS)
  }
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const handleDelete = () => {
    if (!confirm(`「${item.name}」を削除しますか？`)) return
    setShowMenu(false)
    startTransition(async () => {
      await deleteClothingAction(item.id)
    })
  }

  return (
    <>
      <div
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchCancel={cancelLongPress}
        style={{
          background: '#fff',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(232,160,191,0.12)',
          border: '1px solid #FFE4F0',
          position: 'relative',
          opacity: pending ? 0.4 : 1,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
        }}
      >
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
            <img
              src={item.image_url}
              alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
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

      {/* アクションシート */}
      {showMenu && (
        <>
          <div
            onClick={() => setShowMenu(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 50,
            }}
          />
          <div
            style={{
              position: 'fixed',
              left: 12,
              right: 12,
              bottom: 100,
              zIndex: 51,
              background: '#fff',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              maxWidth: 460,
              margin: '0 auto',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #F5C6D8',
                fontSize: '0.78rem',
                color: '#999',
                textAlign: 'center',
              }}
            >
              {item.name}
            </div>
            <button
              onClick={handleDelete}
              style={{
                width: '100%',
                padding: 16,
                background: 'transparent',
                border: 'none',
                color: '#d63384',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              削除
            </button>
            <button
              onClick={() => setShowMenu(false)}
              style={{
                width: '100%',
                padding: 16,
                background: '#FFF5F8',
                border: 'none',
                color: '#666',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                borderTop: '1px solid #F5C6D8',
              }}
            >
              キャンセル
            </button>
          </div>
        </>
      )}
    </>
  )
}
