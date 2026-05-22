// カレンダー：Supabase から自分の着用履歴を読む（Server Component）
import { listOutfits } from '@/lib/outfits'
import { listClothes } from '@/lib/clothes'
import CalendarView from '@/components/CalendarView'

export default async function CalendarPage() {
  const [outfits, clothes] = await Promise.all([listOutfits(), listClothes()])

  // 服 ID → 名前 の辞書
  const clothesMap: Record<string, string> = {}
  clothes.forEach((c) => {
    clothesMap[c.id] = c.name
  })

  return (
    <div style={{ padding: '20px 16px' }}>
      <h1
        style={{
          fontSize: '1.4rem',
          fontWeight: 800,
          color: '#333',
          marginBottom: 20,
        }}
      >
        着用カレンダー 📅
      </h1>
      <CalendarView outfits={outfits} clothesMap={clothesMap} />
    </div>
  )
}
