'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { recordSwipeAction, refreshStyleProfileAction } from '@/app/style/actions'

interface Item {
  name: string
  brand: string
  imageUrl: string
  productUrl: string
}

export default function StyleSwipeClient({
  initialLikedCount,
  hasProfile,
}: {
  initialLikedCount: number
  hasProfile: boolean
}) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [likedCount, setLikedCount] = useState(initialLikedCount)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')
  const [, startTransition] = useTransition()

  const loadFeed = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/style-feed')
      const data = (await res.json()) as Item[]
      setItems(data)
      setIndex(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeed()
  }, [])

  const current = items[index]

  const handleSwipe = (liked: boolean) => {
    if (!current) return
    const item = current
    setIndex((i) => i + 1)
    if (liked) setLikedCount((c) => c + 1)
    startTransition(async () => {
      await recordSwipeAction({
        image_url: item.imageUrl,
        item_name: item.name,
        brand: item.brand,
        liked,
        source: 'rakuten',
      })
    })
  }

  const handleRefreshProfile = async () => {
    setRefreshing(true)
    setRefreshMsg('')
    const result = await refreshStyleProfileAction()
    setRefreshing(false)
    if (result.ok) {
      setRefreshMsg('✨ あなたの嗜好を更新しました')
      router.refresh()
    } else {
      setRefreshMsg(result.error || '更新失敗')
    }
  }

  // フィード終わり
  if (!loading && index >= items.length) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>👏</div>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: 20 }}>
          このセットの判定完了！
          <br />
          次のセットを読み込みますか？
        </p>
        <button
          onClick={loadFeed}
          style={{
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            color: '#fff',
            border: 'none',
            borderRadius: 24,
            padding: '12px 28px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            marginRight: 8,
          }}
        >
          もっと見る
        </button>
        {likedCount >= 5 && (
          <button
            onClick={handleRefreshProfile}
            disabled={refreshing}
            style={{
              background: '#fff',
              color: '#C4779B',
              border: '2px solid #E8A0BF',
              borderRadius: 24,
              padding: '12px 24px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              marginTop: 12,
            }}
          >
            {refreshing ? '分析中…' : hasProfile ? '嗜好を更新' : 'AI に嗜好を分析させる'}
          </button>
        )}
        {refreshMsg && (
          <p
            style={{
              marginTop: 12,
              fontSize: '0.8rem',
              color: refreshMsg.startsWith('✨') ? '#34D399' : '#d63384',
            }}
          >
            {refreshMsg}
          </p>
        )}
      </div>
    )
  }

  if (loading || !current) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
        <p style={{ color: '#999' }}>服を読み込み中…</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* カード */}
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#fff',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(232,160,191,0.25)',
          border: '1px solid #FFE4F0',
        }}
      >
        <div
          style={{
            aspectRatio: '3/4',
            background: '#FFF0F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.imageUrl}
            alt={current.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div style={{ padding: 14 }}>
          <p
            style={{
              fontSize: '0.88rem',
              fontWeight: 700,
              color: '#333',
              marginBottom: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {current.name}
          </p>
          {current.brand && (
            <p style={{ fontSize: '0.72rem', color: '#999' }}>{current.brand}</p>
          )}
        </div>
      </div>

      {/* スワイプボタン */}
      <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
        <button
          onClick={() => handleSwipe(false)}
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#fff',
            border: '3px solid #ddd',
            color: '#999',
            fontSize: '1.6rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          aria-label="いらない"
        >
          ✕
        </button>
        <button
          onClick={() => handleSwipe(true)}
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            border: 'none',
            color: '#fff',
            fontSize: '1.6rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(196,121,155,0.4)',
          }}
          aria-label="いいね"
        >
          ❤
        </button>
      </div>

      <p style={{ fontSize: '0.72rem', color: '#bbb', marginTop: 16 }}>
        {index + 1} / {items.length}
      </p>
    </div>
  )
}
