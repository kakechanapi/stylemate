import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEvent } from '@/lib/events'
import { listFriends } from '@/lib/friends'
import EditEventForm from '@/components/EditEventForm'

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [event, friends] = await Promise.all([getEvent(id), listFriends()])
  if (!event) notFound()

  return (
    <div>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: '1px solid #FFE4F0',
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Link href="/events" style={{ color: '#999', fontSize: '1.2rem' }}>
          ‹
        </Link>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#333', marginLeft: 14 }}>
          予定を編集
        </h1>
      </header>

      <div style={{ padding: '20px 16px' }}>
        <EditEventForm
          event={event}
          friends={friends.map((f) => ({ id: f.id, name: f.name }))}
        />
      </div>
    </div>
  )
}
