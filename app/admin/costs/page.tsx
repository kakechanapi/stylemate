// 管理者用：APIコストのリアルタイムダッシュボード
// 30秒オートリフレッシュで「リアルタイム風」に動く。
// 環境変数 ADMIN_EMAILS or profiles.is_admin = TRUE の人だけアクセス可。

import { redirect } from 'next/navigation'
import { checkAdmin } from '@/lib/admin'
import { fetchDashboardSummary } from '@/lib/admin-costs'
import CostsDashboardClient from './CostsDashboardClient'

export const dynamic = 'force-dynamic'

export default async function AdminCostsPage() {
  const admin = await checkAdmin()
  if (!admin.isAdmin) {
    redirect('/?error=admin_required')
  }
  const initial = await fetchDashboardSummary()
  return <CostsDashboardClient initial={initial} />
}
