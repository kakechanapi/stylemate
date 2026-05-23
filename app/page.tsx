// ホーム：Server Component で実データ取得し、Client に渡してインタラクション
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listClothes } from '@/lib/clothes'
import { listEvents } from '@/lib/events'
import { listFriends } from '@/lib/friends'
import HomeClient from './HomeClient'

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const clothes = await listClothes()

  // 今日〜明日の予定を取得（被り回避コーデ提案用）
  const now = new Date()
  const tomorrowEnd = new Date(now)
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)
  tomorrowEnd.setHours(23, 59, 59, 999)

  const [upcomingEvents, friends] = await Promise.all([
    listEvents({ from: now.toISOString(), to: tomorrowEnd.toISOString(), limit: 3 }),
    listFriends(),
  ])

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
