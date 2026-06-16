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

// 自動学習が発火するタイミング
// - LIKE + NOPE 合計が「LEARN_EVERY の倍数」になったとき発火
// - ただし LIKE が MIN_LIKED_TO_LEARN 件以上ないと
//   分析できない（style.ts 側でガード）ので、それまでは発火しない
const LEARN_EVERY = 3
const MIN_LIKED_TO_LEARN = 5

export default function StyleSwipeClient({
  initialLikedCount,
  initialNopeCount,
  hasProfile,
}: {
  initialLikedCount: number
  initialNopeCount: number
  hasProfile: boolean
}) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [likedCount, setLikedCount] = useState(initialLikedCount)
  const [nopeCount, setNopeCount] = useState(initialNopeCount)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')
  // 自動学習が走った直後に表示する小さなトースト
  const [autoLearnedMsg, setAutoLearnedMsg] = useState('')
  // 同じ合計件数で連続発火しないようガード
  const autoLearnFiredFor = useRef<Set<number>>(new Set())
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
  const next = items[index + 1]

  const recordCurrent = (liked: boolean) => {
    if (!current) return
    const item = current
    // LIKE / NOPE どちらでもカウンタを更新
    const nextLiked = liked ? likedCount + 1 : likedCount
    const nextNope = liked ? nopeCount : nopeCount + 1
    if (liked) setLikedCount(nextLiked)
    else setNopeCount(nextNope)

    // 自動学習の発火判定
    // - LIKE が 5 件以上（分析に必要な最低数）
    // - LIKE + NOPE の合計が 3 の倍数
    // - 同じ件数で多重発火しない
    const nextTotal = nextLiked + nextNope
    const shouldLearn =
      nextLiked >= MIN_LIKED_TO_LEARN &&
      nextTotal % LEARN_EVERY === 0 &&
      !autoLearnFiredFor.current.has(nextTotal)
    if (shouldLearn) {
      autoLearnFiredFor.current.add(nextTotal)
      // 裏で発火・UI はブロックしない
      setTimeout(() => {
        void (async () => {
          const result = await refreshStyleProfileAction()
          if (result.ok) {
            setAutoLearnedMsg(`✨ ${nextLiked}件の好みから AI が分析を更新しました`)
            setTimeout(() => setAutoLearnedMsg(''), 3000)
            router.refresh()
          }
        })()
      }, 0)
    }

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

  /** 次の AI 学習までの残り回数を文言で返す */
  const learnHintText = (): string => {
    if (likedCount < MIN_LIKED_TO_LEARN) {
      const remain = MIN_LIKED_TO_LEARN - likedCount
      return `LIKE をあと ${remain} 回で AI 学習スタート`
    }
    const total = likedCount + nopeCount
    const remain = LEARN_EVERY - (total % LEARN_EVERY || LEARN_EVERY)
    return `あと ${remain} 回スワイプで AI が好みを更新`
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
      setRefreshMsg('✨ あなたの好みを更新しました')
      router.refresh()
    } else {
      setRefreshMsg(result.error || '更新失敗')
    }
  }

  // フィードがそもそも空（API未連携 or 取得失敗）
  if (!loading && items.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: 28,
          background: '#FFF8FB',
          border: '1px dashed #FFE4F0',
          borderRadius: 16,
          color: '#666',
          lineHeight: 1.7,
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🛍</div>
        <p style={{ color: '#333', fontSize: '0.95rem', fontWeight: 700, marginBottom: 8 }}>
          好みスワイプは準備中です
        </p>
        <p style={{ fontSize: '0.8rem', marginBottom: 16, color: '#888' }}>
          楽天 / Yahoo!ショッピング API が未連携のため、
          <br />
          スワイプ用の画像を取得できません。
          <br />
          API 連携後に自動的に利用可能になります。
        </p>
        <button
          onClick={loadFeed}
          style={{
            background: '#fff',
            color: '#C4779B',
            border: '2px solid #E8A0BF',
            borderRadius: 20,
            padding: '8px 20px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          再試行
        </button>
      </div>
    )
  }

  // フィード終わり（一通り判定済み）
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
            {refreshing ? '分析中…' : hasProfile ? '今すぐ好みを再分析' : 'AI に好みを分析させる'}
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

  const cardTransform = exitTo
    ? exitTransform
    : dragging || dragX !== 0
      ? `translate(${dragX}px, 0) rotate(${rotateDeg}deg)`
      : ''

  // 退場中は次カードを前面に少し浮かせる（Tinder式）
  // それ以外は通常の「奥」位置
  const nextCardStyle: React.CSSProperties = exitTo
    ? {
        transform: 'scale(1) translateY(0)',
        opacity: 1,
      }
    : {
        transform: 'scale(0.95) translateY(8px)',
        opacity: 0.7,
      }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* カード群（次のカードを薄く後ろに） */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, height: 480, marginBottom: 20 }}>
        {next && (
          <Card
            // 次カードは「位置スロット」基準で固定キー。
            // 退場中だけ前面に浮かせて、index 切替時の見た目を滑らかにする。
            key="next-slot"
            item={next}
            style={{
              position: 'absolute',
              inset: 0,
              ...nextCardStyle,
              transition: 'transform 0.25s ease-out, opacity 0.25s ease-out',
              pointerEvents: 'none',
            }}
          />
        )}
        <Card
          // key=index で前カードを退場後に確実にアンマウント
          // → スワイプしたカードが「元に戻ってくる」見え方を防ぐ
          key={`front-${index}`}
          item={current}
          style={{
            position: 'absolute',
            inset: 0,
            transform: cardTransform,
            transition: dragging ? 'none' : 'transform 0.25s ease-out',
            touchAction: 'pan-y',
            cursor: dragging ? 'grabbing' : 'grab',
            zIndex: 20,
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            onPointerDown(e.clientX)
          }}
          onPointerMove={(e) => onPointerMove(e.clientX)}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

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

      {/* 自動学習のカウントダウン */}
      <div
        style={{
          marginTop: 8,
          fontSize: '0.7rem',
          color: '#C4779B',
          background: '#FFF0F6',
          padding: '4px 12px',
          borderRadius: 12,
          fontWeight: 700,
        }}
      >
        🧠 {learnHintText()}
      </div>

      {/* 自動学習が走ったときのトースト */}
      {autoLearnedMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #34D399, #10B981)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 24,
            fontSize: '0.82rem',
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(52,211,153,0.4)',
            zIndex: 100,
            maxWidth: '90%',
            textAlign: 'center',
            animation: 'fadeInUp 0.3s ease-out',
          }}
        >
          {autoLearnedMsg}
        </div>
      )}
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
