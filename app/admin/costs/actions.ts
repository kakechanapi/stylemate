'use server'

import { requireAdmin } from '@/lib/admin'
import { fetchDashboardSummary } from '@/lib/admin-costs'

export async function refreshDashboardAction() {
  await requireAdmin()
  return fetchDashboardSummary()
}
