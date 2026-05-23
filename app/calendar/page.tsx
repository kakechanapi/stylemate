// カレンダー：Supabase から自分の着用履歴を読む（Server Component）
import Link from 'next/link'
import { listOutfits } from '@/lib/outfits'
import { listClothes } from '@/lib/clothes'
import CalendarView from '@/components/CalendarView'

export default async function CalendarPage() {
  const [outfits, clothes] = await Promise.all([listOutfits(), listClothes()])

  const clothesMap: Record<string, string> = {}
  clothes.forEach((c) => {
    clothesMap[c.id] = c.name
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
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333' }}>
          着用カレンダー 📅
        </h1>
        <Link
          href="/outfits/new"
          style={{
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            color: '#fff',
            borderRadius: 20,
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          ＋ 記録
        </Link>
      </div>
      <CalendarView outfits={outfits} clothesMap={clothesMap} />
    </div>
  )
}
