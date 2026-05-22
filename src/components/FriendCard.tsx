'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Friend } from '@/types/fashion'
import { deleteFriendAction } from '@/app/friends/actions'

const LORA_LABEL: Record<string, { text: string; color: string }> = {
  none: { text: '通常モード', color: '#999' },
  pending: { text: '本人モード候補', color: '#E8A0BF' },
  training: { text: '訓練中…', color: '#60A5FA' },
  ready: { text: '✓ 本人モード', color: '#34D399' },
  failed: { text: '訓練失敗', color: '#F87171' },
}

export default function FriendCard({ friend }: { friend: Friend }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    startTransition(async () => {
      await deleteFriendAction(friend.id)
      router.refresh()
    })
  }

  const lora = LORA_LABEL[friend.lora_status] || LORA_LABEL.none

  return (
    <Link
      href={`/friends/${friend.id}`}
      style={{
        background: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(232,160,191,0.12)',
        border: friend.is_me ? '2px solid #E8A0BF' : '1px solid #FFE4F0',
        position: 'relative',
        textDecoration: 'none',
        color: 'inherit',
        opacity: pending ? 0.4 : 1,
        display: 'block',
      }}
    >
      {/* 削除 */}
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
        title={confirming ? 'もう一度押して削除' : '削除'}
      >
        {confirming ? '?' : '×'}
      </button>

      {/* 自分バッジ */}
      {friend.is_me && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            background: '#E8A0BF',
            color: '#fff',
            fontSize: '0.6rem',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 6,
            zIndex: 1,
          }}
        >
          自分
        </div>
      )}

      {/* サムネ */}
      <div
        style={{
          aspectRatio: '1',
          background: '#FFF0F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {friend.thumb_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={friend.thumb_url}
            alt={friend.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '2.5rem' }}>{friend.is_me ? '🙂' : '👤'}</span>
        )}
      </div>

      {/* 情報 */}
      <div style={{ padding: 10 }}>
        <p
          style={{
            fontSize: '0.88rem',
            fontWeight: 700,
            color: '#333',
            marginBottom: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {friend.name}
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 4,
          }}
        >
          <span style={{ fontSize: '0.68rem', color: '#999' }}>
            📸 {friend.face_photo_count}枚
          </span>
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              color: lora.color,
              background: `${lora.color}15`,
              borderRadius: 6,
              padding: '2px 6px',
            }}
          >
            {lora.text}
          </span>
        </div>
      </div>
    </Link>
  )
}
