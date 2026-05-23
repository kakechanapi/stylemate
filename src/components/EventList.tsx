'use client'
import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { EventItem } from '@/lib/events'
import { deleteEventAction } from '@/app/events/actions'

interface Props {
  upcoming: EventItem[]
  past: EventItem[]
  friendNames: Record<string, string>
}

export default function EventList({ upcoming, past, friendNames }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [menuFor, setMenuFor] = useState<EventItem | null>(null)

  const handleDelete = (id: string) => {
    setMenuFor(null)
    if (!confirm('この予定を削除しますか？')) return
    startTransition(async () => {
      await deleteEventAction(id)
      router.refresh()
    })
  }

  return (
    <>
      <Section
        title="これからの予定"
        events={upcoming}
        friendNames={friendNames}
        onOpenMenu={setMenuFor}
        emptyText="まだ予定がありません"
      />
      {past.length > 0 && (
        <Section
          title="過去の予定"
          events={past.slice(0, 10)}
          friendNames={friendNames}
          onOpenMenu={setMenuFor}
          dim
        />
      )}

      {/* アクションシート */}
      {menuFor && (
        <>
          <div
            onClick={() => setMenuFor(null)}
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
                fontSize: '0.85rem',
                color: '#333',
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              {menuFor.title}
            </div>
            <div style={{ padding: '10px 16px', fontSize: '0.78rem', color: '#666', textAlign: 'center' }}>
              {new Date(menuFor.starts_at).toLocaleString('ja-JP', {
                month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </div>
            <button
              onClick={() => {
                router.push(`/events/${menuFor.id}/edit`)
                setMenuFor(null)
              }}
              style={{
                width: '100%',
                padding: 16,
                background: 'transparent',
                border: 'none',
                borderTop: '1px solid #F5C6D8',
                color: '#333',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              編集
            </button>
            <button
              onClick={() => handleDelete(menuFor.id)}
              style={{
                width: '100%',
                padding: 16,
                background: 'transparent',
                border: 'none',
                borderTop: '1px solid #F5C6D8',
                color: '#d63384',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              削除
            </button>
            <button
              onClick={() => setMenuFor(null)}
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

function Section({
  title,
  events,
  friendNames,
  onOpenMenu,
  emptyText,
  dim,
}: {
  title: string
  events: EventItem[]
  friendNames: Record<string, string>
  onOpenMenu: (e: EventItem) => void
  emptyText?: string
  dim?: boolean
}) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontSize: '0.7rem',
          color: '#999',
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
          paddingLeft: 4,
          marginBottom: 8,
        }}
      >
        {title}
      </h2>
      {events.length === 0 ? (
        <p style={{ color: '#bbb', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
          {emptyText || ''}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              friendNames={friendNames}
              onOpenMenu={onOpenMenu}
              dim={dim}
            />
          ))}
        </div>
      )}
    </section>
  )
}

const LONG_PRESS_MS = 500

function EventCard({
  event,
  friendNames,
  onOpenMenu,
  dim,
}: {
  event: EventItem
  friendNames: Record<string, string>
  onOpenMenu: (e: EventItem) => void
  dim?: boolean
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)

  const startLongPress = () => {
    longPressed.current = false
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true
      onOpenMenu(event)
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40)
    }, LONG_PRESS_MS)
  }
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const handleClick = () => {
    if (longPressed.current) return
    onOpenMenu(event)
  }

  const date = new Date(event.starts_at)
  const dateStr = date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  })
  const timeStr = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  const friends = (event.friend_ids || [])
    .map((id) => friendNames[id])
    .filter(Boolean)

  return (
    <div
      onClick={handleClick}
      onMouseDown={startLongPress}
      onMouseUp={cancelLongPress}
      onMouseLeave={cancelLongPress}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchCancel={cancelLongPress}
      style={{
        background: '#fff',
        border: '1px solid #FFE4F0',
        borderRadius: 12,
        padding: 14,
        opacity: dim ? 0.6 : 1,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          fontSize: '0.72rem',
          color: '#C4779B',
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {dateStr} {timeStr}
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>
        {event.title}
      </div>
      {friends.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginTop: 4,
          }}
        >
          {friends.map((name, i) => (
            <span
              key={i}
              style={{
                background: '#FFF0F6',
                color: '#C4779B',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 8,
              }}
            >
              👤 {name}
            </span>
          ))}
        </div>
      )}
      {event.location && (
        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 4 }}>
          📍 {event.location}
        </div>
      )}
    </div>
  )
}
