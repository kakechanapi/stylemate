// ホーム：Server Component で実データ取得し、Client に渡してインタラクション
// パフォーマンス：すべて Promise.all 並列、user 取得も並列化
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listClothes } from '@/lib/clothes'
import { listEvents } from '@/lib/events'
import { listFriends } from '@/lib/friends'
import { listOutfits } from '@/lib/outfits'
import { checkAdmin } from '@/lib/admin'
import { toJSTDateStr, jstDateStrDaysAgo } from '@/lib/date-helpers'
import HomeClient from './HomeClient'
import CapWarningBanner from '@/components/CapWarningBanner'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ suggest?: string }>
}) {
  const { suggest } = await searchParams
  const now = new Date()
  // Vercel は UTC なので「今日」「明日の終わり」は必ず JST 基準で計算する
  const todayStr = toJSTDateStr()
  const tomorrowEnd = new Date(`${jstDateStrDaysAgo(-1)}T23:59:59+09:00`)

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

  // 初回体験：服が0着 & オンボーディング未訪問なら一本道へ誘導。
  // cookie はオンボーディング画面のマウント時に立つので、ループはしない
  // （スキップした人は空クローゼットのホームに戻ってこられる）
  if (clothes.length === 0) {
    const cookieStore = await cookies()
    if (!cookieStore.get('sm_onboarded')) {
      redirect('/onboarding')
    }
  }

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
        autoSuggest={suggest === '1'}
      />
    </>
  )
}
