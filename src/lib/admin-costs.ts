// /admin/costs ダッシュボード用の集計クエリ
// すべて管理者権限前提（RLS で他人の usage_logs も読める）
// ⚠️ このファイルは createSupabaseServerClient を使うため
//    クライアントコンポーネントから import 禁止。
//    クライアント側で型・ラベルが必要な場合は admin-costs-shared.ts を使う。

import { createSupabaseServerClient } from './supabase/server'
import type { DashboardSummary } from './admin-costs-shared'

export type { DashboardSummary } from './admin-costs-shared'
export { getServiceLabel, getServiceUnitCost } from './admin-costs-shared'

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const supabase = await createSupabaseServerClient()

  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now)
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const startOf30DaysAgo = new Date(now)
  startOf30DaysAgo.setDate(now.getDate() - 29)
  startOf30DaysAgo.setHours(0, 0, 0, 0)

  // 今月のログ全件
  const { data: monthLogs } = await supabase
    .from('api_usage_logs')
    .select('id, user_id, service, cost_jpy, created_at')
    .gte('created_at', startOf30DaysAgo.toISOString())
    .order('created_at', { ascending: false })

  const logs = monthLogs || []

  // ユーザー名解決用
  const userIds = Array.from(new Set(logs.map((l) => l.user_id).filter(Boolean) as string[]))
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, username').in('id', userIds)
    : { data: [] }
  const userMap = new Map<string, string | null>()
  for (const p of profiles || []) userMap.set(p.id, p.username || null)

  // auth.users からメアド取得は server-side でも RLS 縛りで難しいので username で代替

  let todayTotal = 0
  let monthTotal = 0
  const byService: Record<string, { count: number; cost: number }> = {}
  const userAgg = new Map<string, { cost: number; count: number }>()
  const dailyAgg = new Map<string, number>()

  for (const log of logs) {
    const cost = Number(log.cost_jpy) || 0
    const created = new Date(log.created_at)
    const dateKey = created.toISOString().slice(0, 10)

    // 過去30日のトレンド
    dailyAgg.set(dateKey, (dailyAgg.get(dateKey) || 0) + cost)

    // 今月
    if (created >= startOfMonth) {
      monthTotal += cost
      // サービス別
      const s = byService[log.service] || { count: 0, cost: 0 }
      s.count++
      s.cost += cost
      byService[log.service] = s
      // ユーザー別
      if (log.user_id) {
        const u = userAgg.get(log.user_id) || { cost: 0, count: 0 }
        u.cost += cost
        u.count++
        userAgg.set(log.user_id, u)
      }
    }
    // 今日
    if (created >= startOfDay) {
      todayTotal += cost
    }
  }

  // Top10 ユーザー
  const topUsers = Array.from(userAgg.entries())
    .map(([user_id, agg]) => ({
      user_id,
      email: null, // server-side で auth.users を全件取るのは権限的に難しい
      username: userMap.get(user_id) || null,
      cost: agg.cost,
      count: agg.count,
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10)

  // 過去30日の trend（古→新の順）
  const daily: { date: string; cost: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const key = d.toISOString().slice(0, 10)
    daily.push({ date: key, cost: dailyAgg.get(key) || 0 })
  }

  // 直近20件
  const recent = logs.slice(0, 20).map((l) => ({
    id: l.id,
    user_id: l.user_id,
    username: l.user_id ? userMap.get(l.user_id) || null : null,
    service: l.service,
    cost: Number(l.cost_jpy) || 0,
    created_at: l.created_at,
  }))

  return {
    todayTotal,
    monthTotal,
    byService,
    topUsers,
    daily,
    recent,
  }
}

