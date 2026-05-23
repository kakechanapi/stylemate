// 今日のコーデを記録
import Link from 'next/link'
import { listClothes } from '@/lib/clothes'
import { listFriends } from '@/lib/friends'
import { listEvents } from '@/lib/events'
import NewOutfitForm from '@/components/NewOutfitForm'

export default async function NewOutfitPage() {
  // 今日の予定を取得（被り回避用にプリフィル）
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [clothes, friends, todayEvents] = await Promise.all([
    listClothes(),
    listFriends(),
    listEvents({ from: today.toISOString(), to: tomorrow.toISOString() }),
  ])

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
        <Link href="/" style={{ color: '#999', fontSize: '1.2rem' }}>
          ‹
        </Link>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#333', marginLeft: 14 }}>
          今日のコーデを記録
        </h1>
      </header>

      <div style={{ padding: '20px 16px' }}>
        <NewOutfitForm
          clothes={clothes}
          friends={friends.map((f) => ({ id: f.id, name: f.name }))}
          todayEvents={todayEvents}
        />
      </div>
    </div>
  )
}
