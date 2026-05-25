'use client'
import { useEffect, useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { recordSwipeAction, refreshStyleProfileAction } from '@/app/style/actions'

interface Item {
  name: string
  brand: string
  imageUrl: string
  productUrl: string
}

const SWIPE_THRESHOLD = 120 // 横方向ドラッグでこの値を超えたら確定

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

  // drag 状態
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStartX = useRef<number | null>(null)
  const [exitTo, setExitTo] = useState<'left' | 'right' | null>(null)

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

  const recordCurrent = (liked: boolean) => {
    if (!current) return
    const item = current
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

  const advance = (liked: boolean) => {
    setExitTo(liked ? 'right' : 'left')
    recordCurrent(liked)
    // アニメーション完了後にカード切替
    setTimeout(() => {
      setIndex((i) => i + 1)
      setDragX(0)
      setExitTo(null)
    }, 250)
  }

  // ─── Pointer Events ───
  const onPointerDown = (clientX: number) => {
    if (exitTo) return
    dragStartX.current = clientX
    setDragging(true)
  }
  const onPointerMove = (clientX: number) => {
    if (dragStartX.current === null) return
    setDragX(clientX - dragStartX.current)
  }
  const onPointerUp = () => {
    if (dragStartX.current === null) return
    if (Math.abs(dragX) >= SWIPE_THRESHOLD) {
      advance(dragX > 0)
    } else {
      // 戻す
      setDragX(0)
    }
    dragStartX.current = null
    setDragging(false)
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

  // ─── 描画 ───
  const dragRatio = Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD)
  const rotateDeg = (dragX / SWIPE_THRESHOLD) * 15

  // exit アニメーション用の transform
  const exitTransform =
    exitTo === 'right'
      ? `translate(${window.innerWidth}px, -40px) rotate(20deg)`
      : exitTo === 'left'
        ? `translate(-${window.innerWidth}px, -40px) rotate(-20deg)`
        : ''

  // カードスタック（Tinder式の浮き上がり）
  // - 退場中(exitTo!=null): 4枚レンダリング、depth=-1(退場), 0(新前面), 1, 2
  // - 通常時: 3枚、depth=0(前面), 1, 2
  // - stable key (item.imageUrl) でindex変化時もDOMを保持し、
  //   depthに応じた transform を CSS transition で滑らかに繰り上げる
  const isExiting = exitTo !== null
  const visibleStartIndex = index
  const visibleEndIndex = index + (isExiting ? 4 : 3)
  const stack = items.slice(visibleStartIndex, visibleEndIndex)

  // depth → スタイル
  const styleForDepth = (
    depth: number,
    isFront: boolean,
  ): React.CSSProperties => {
    if (depth === -1) {
      // 退場するカード
      return {
        transform: exitTransform,
        opacity: 1,
        zIndex: 30,
      }
    }
    if (depth === 0) {
      // 前面：drag transform を適用（前面のみ）
      const t = isFront && !isExiting
        ? (dragging || dragX !== 0
          ? `translate(${dragX}px, 0) rotate(${rotateDeg}deg)`
          : '')
        : ''
      return { transform: t, opacity: 1, zIndex: 20 }
    }
    if (depth === 1) {
      return {
        transform: 'scale(0.95) translateY(8px)',
        opacity: 0.7,
        zIndex: 10,
      }
    }
    // depth === 2
    return {
      transform: 'scale(0.9) translateY(16px)',
      opacity: 0.4,
      zIndex: 5,
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* カード群（スタック） */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, height: 480, marginBottom: 20 }}>
        {stack.map((item, relIdx) => {
          const depth = isExiting ? relIdx - 1 : relIdx
          // 前面（depth=0 かつ非退場時のみ）が drag を受け付ける
          const isFront = depth === 0 && !isExiting
          const depthStyle = styleForDepth(depth, isFront)
          return (
            <Card
              // stable key：index 変化時もDOMを保持して transition を滑らかに走らせる
              key={item.productUrl || item.imageUrl}
              item={item}
              style={{
                position: 'absolute',
                inset: 0,
                ...depthStyle,
                transition:
                  dragging && isFront
                    ? 'none'
                    : 'transform 0.25s ease-out, opacity 0.25s ease-out',
                touchAction: 'pan-y',
                cursor: isFront ? (dragging ? 'grabbing' : 'grab') : 'default',
                pointerEvents: isFront ? 'auto' : 'none',
              }}
              onPointerDown={
                isFront
                  ? (e) => {
                      e.currentTarget.setPointerCapture(e.pointerId)
                      onPointerDown(e.clientX)
                    }
                  : undefined
              }
              onPointerMove={isFront ? (e) => onPointerMove(e.clientX) : undefined}
              onPointerUp={isFront ? onPointerUp : undefined}
              onPointerCancel={isFront ? onPointerUp : undefined}
            />
          )
        })}

        {/* 左右のオーバーレイラベル */}
        {dragX > 30 && (
          <div
            style={{
              position: 'absolute',
              top: 24,
              left: 24,
              padding: '8px 16px',
              border: '3px solid #C4779B',
              color: '#C4779B',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: '1.2rem',
              transform: 'rotate(-15deg)',
              opacity: dragRatio,
              pointerEvents: 'none',
            }}
          >
            LIKE ❤
          </div>
        )}
        {dragX < -30 && (
          <div
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              padding: '8px 16px',
              border: '3px solid #999',
              color: '#999',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: '1.2rem',
              transform: 'rotate(15deg)',
              opacity: dragRatio,
              pointerEvents: 'none',
            }}
          >
            NOPE
          </div>
        )}
      </div>

      {/* スワイプボタン（補助） */}
      <div style={{ display: 'flex', gap: 24 }}>
        <button
          onClick={() => advance(false)}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#fff',
            border: '3px solid #ddd',
            color: '#999',
            fontSize: '1.4rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          aria-label="いらない"
        >
          ✕
        </button>
        <button
          onClick={() => advance(true)}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            border: 'none',
            color: '#fff',
            fontSize: '1.4rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(196,121,155,0.4)',
          }}
          aria-label="いいね"
        >
          ❤
        </button>
      </div>

      <p style={{ fontSize: '0.72rem', color: '#bbb', marginTop: 16 }}>
        {index + 1} / {items.length}　·　← 左でNOPE　/　右で LIKE →
      </p>
    </div>
  )
}

// 単一カード描画
function Card({
  item,
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  item: Item
  style: React.CSSProperties
  onPointerDown?: (e: React.PointerEvent) => void
  onPointerMove?: (e: React.PointerEvent) => void
  onPointerUp?: () => void
  onPointerCancel?: () => void
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{
        background: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(232,160,191,0.25)',
        border: '1px solid #FFE4F0',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          height: 380,
          background: '#FFF0F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.name}
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
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
          {item.name}
        </p>
        {item.brand && (
          <p style={{ fontSize: '0.72rem', color: '#999' }}>{item.brand}</p>
        )}
      </div>
    </div>
  )
}
