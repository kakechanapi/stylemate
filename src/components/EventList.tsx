'use client'
import { useTransition } from 'react'
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

  const handleDelete = (id: string) => {
    if (!confirm('この予定を削除しますか？')) return
    startTransition(async () => {
      await deleteEventAction(id)
      router.refresh()
    })
  }

  return (
    <>
      <Section title="これからの予定" events={upcoming} friendNames={friendNames} onDelete={handleDelete} emptyText="まだ予定がありません" />
      {past.length > 0 && (
        <Section title="過去の予定" events={past.slice(0, 10)} friendNames={friendNames} onDelete={handleDelete} dim />
      )}
    </>
  )
}

function Section({
  title,
  events,
  friendNames,
  onDelete,
  emptyText,
  dim,
}: {
  title: string
  events: EventItem[]
  friendNames: Record<string, string>
  onDelete: (id: string) => void
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
              onDelete={onDelete}
              dim={dim}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function EventCard({
  event,
  friendNames,
  onDelete,
  dim,
}: {
  event: EventItem
  friendNames: Record<string, string>
  onDelete: (id: string) => void
  dim?: boolean
}) {
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
      style={{
        background: '#fff',
        border: '1px solid #FFE4F0',
        borderRadius: 12,
        padding: 14,
        opacity: dim ? 0.6 : 1,
        position: 'relative',
      }}
    >
      <button
        onClick={() => onDelete(event.id)}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(0,0,0,0.4)',
          color: '#fff',
          fontSize: '0.7rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
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
