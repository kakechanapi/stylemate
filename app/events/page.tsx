// 予定一覧 + 追加
import Link from 'next/link'
import { listEvents } from '@/lib/events'
import { listFriends } from '@/lib/friends'
import EventList from '@/components/EventList'

export default async function EventsPage() {
  const [events, friends] = await Promise.all([listEvents(), listFriends()])

  // 友人 ID → 名前 マップ
  const friendNames: Record<string, string> = {}
  friends.forEach((f) => {
    friendNames[f.id] = f.name
  })

  // 今後の予定（未来）
  const now = new Date().toISOString()
  const upcoming = events.filter((e) => e.starts_at >= now)
  const past = events.filter((e) => e.starts_at < now)

  return (
    <div style={{ padding: '20px 16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333' }}>予定 📅</h1>
        <Link
          href="/events/new"
          style={{
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            color: '#fff',
            borderRadius: 20,
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          ＋ 追加
        </Link>
      </div>

      <p
        style={{
          fontSize: '0.75rem',
          color: '#999',
          background: '#FFF5F8',
          padding: 12,
          borderRadius: 12,
          marginBottom: 20,
          lineHeight: 1.6,
        }}
      >
        予定に登録した友人と最近会った時のコーデを AI が記憶していて、
        次会う時に被らない提案ができます。
      </p>

      <EventList upcoming={upcoming} past={past} friendNames={friendNames} />
    </div>
  )
}
