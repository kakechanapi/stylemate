// ホーム：Server Component で実データ取得し、Client に渡してインタラクション
// パフォーマンス：すべて Promise.all 並列、user 取得も並列化
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listClothes } from '@/lib/clothes'
import { listEvents } from '@/lib/events'
import { listFriends } from '@/lib/friends'
import { listOutfits } from '@/lib/outfits'
import { checkAdmin } from '@/lib/admin'
import HomeClient from './HomeClient'
import CapWarningBanner from '@/components/CapWarningBanner'

export default async function HomePage() {
  const now = new Date()
  const tomorrowEnd = new Date(now)
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)
  tomorrowEnd.setHours(23, 59, 59, 999)

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // 全てのデータ取得を並列化（user 含む）
  const supabase = await createSupabaseServerClient()
  const [userRes, clothes, upcomingEvents, friends, todayOutfits, admin] = await Promise.all([
    supabase.auth.getUser(),
    listClothes(),
    listEvents({ from: now.toISOString(), to: tomorrowEnd.toISOString(), limit: 3 }),
    listFriends(),
    listOutfits({ from: todayStr, to: todayStr }),
    checkAdmin(),
  ])

  const user = userRes.data.user
  const friendNames: Record<string, string> = {}
  friends.forEach((f) => {
    friendNames[f.id] = f.name
  })

  // 「今日確定済みのコーデ」を最新1件だけ拾う（複数あれば最後に作ったもの）
  const todayOutfit = todayOutfits.length > 0 ? todayOutfits[0] : null

  return (
    <>
      {/* 月間使用量が 80% 超え or 100% 超過の時のみ表示 */}
      <div style={{ padding: '12px 16px 0' }}>
        <CapWarningBanner />
      </div>
      <HomeClient
        clothes={clothes}
        userEmail={user?.email || null}
        upcomingEvents={upcomingEvents}
        friendNames={friendNames}
        todayOutfit={todayOutfit}
        isAdmin={admin.isAdmin}
      />
    </>
  )
}
