// ホーム：Server Component で実データ取得し、Client に渡してインタラクション
// パフォーマンス：すべて Promise.all 並列、user 取得も並列化
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listClothes } from '@/lib/clothes'
import { listEvents } from '@/lib/events'
import { listFriends } from '@/lib/friends'
import HomeClient from './HomeClient'

export default async function HomePage() {
  const now = new Date()
  const tomorrowEnd = new Date(now)
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)
  tomorrowEnd.setHours(23, 59, 59, 999)

  // 全てのデータ取得を並列化（user 含む）
  const supabase = await createSupabaseServerClient()
  const [userRes, clothes, upcomingEvents, friends] = await Promise.all([
    supabase.auth.getUser(),
    listClothes(),
    listEvents({ from: now.toISOString(), to: tomorrowEnd.toISOString(), limit: 3 }),
    listFriends(),
  ])

  const user = userRes.data.user
  const friendNames: Record<string, string> = {}
  friends.forEach((f) => {
    friendNames[f.id] = f.name
  })

  return (
    <HomeClient
      clothes={clothes}
      userEmail={user?.email || null}
      upcomingEvents={upcomingEvents}
      friendNames={friendNames}
    />
  )
}
