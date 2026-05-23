// 予定追加フォーム
import Link from 'next/link'
import { listFriends } from '@/lib/friends'
import NewEventForm from '@/components/NewEventForm'

export default async function NewEventPage() {
  const friends = await listFriends()

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
          予定を追加
        </h1>
      </header>

      <div style={{ padding: '20px 16px' }}>
        <NewEventForm friends={friends.map((f) => ({ id: f.id, name: f.name }))} />
      </div>
    </div>
  )
}
