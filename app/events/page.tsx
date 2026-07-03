// カレンダー画面：予定 + 着用記録 を月ビューと一緒に
// パフォーマンス：当月 ±1ヶ月の範囲だけ取得（全データ取得を避ける）
import Link from 'next/link'
import { listEvents } from '@/lib/events'
import { listOutfits } from '@/lib/outfits'
import { listClothes } from '@/lib/clothes'
import { listFriends } from '@/lib/friends'
import { toJSTDateStr } from '@/lib/date-helpers'
import CalendarHybridView from '@/components/CalendarHybridView'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams

  // 表示対象月（YYYY-MM）
  // Vercel は UTC なので、無指定時の「今月」は JST 基準で決める
  // （UTC のままだと JST の月初 0:00〜8:59 に前月が表示される）
  const baseMonth = month || toJSTDateStr().slice(0, 7)
  const base = new Date(`${baseMonth}-01T00:00:00`)
  const year = base.getFullYear()
  const m = base.getMonth()

  // クエリ範囲：表示月の前後1ヶ月
  const from = new Date(year, m - 1, 1).toISOString()
  const toDate = new Date(year, m + 2, 0, 23, 59, 59)
  const to = toDate.toISOString()
  const fromYmd = `${new Date(year, m - 1, 1).getFullYear()}-${String(new Date(year, m - 1, 1).getMonth() + 1).padStart(2, '0')}-01`
  const toYmd = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`

  const [events, outfits, clothes, friends] = await Promise.all([
    listEvents({ from, to }),
    listOutfits({ from: fromYmd, to: toYmd }),
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
        initialMonth={`${year}-${String(m + 1).padStart(2, '0')}`}
      />
    </div>
  )
}
