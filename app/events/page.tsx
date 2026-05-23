// カレンダー画面：予定 + 着用記録 を月ビューと一緒に
import Link from 'next/link'
import { listEvents } from '@/lib/events'
import { listOutfits } from '@/lib/outfits'
import { listClothes } from '@/lib/clothes'
import { listFriends } from '@/lib/friends'
import CalendarHybridView from '@/components/CalendarHybridView'

export default async function CalendarPage() {
  const [events, outfits, clothes, friends] = await Promise.all([
    listEvents(),
    listOutfits(),
    listClothes(),
    listFriends(),
  ])

  const friendNames: Record<string, string> = {}
  friends.forEach((f) => {
    friendNames[f.id] = f.name
  })

  const clothesMap: Record<string, { name: string; image_url?: string }> = {}
  clothes.forEach((c) => {
    clothesMap[c.id] = { name: c.name, image_url: c.image_url }
  })

  return (
    <div style={{ padding: '20px 16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333' }}>カレンダー 📅</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            href="/outfits/new"
            style={{
              background: '#fff',
              border: '2px solid #E8A0BF',
              color: '#C4779B',
              borderRadius: 20,
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            ✍ 記録
          </Link>
          <Link
            href="/events/new"
            style={{
              background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
              color: '#fff',
              borderRadius: 20,
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            ＋ 予定
          </Link>
        </div>
      </div>

      <CalendarHybridView
        events={events}
        outfits={outfits}
        clothesMap={clothesMap}
        friendNames={friendNames}
      />
    </div>
  )
}
