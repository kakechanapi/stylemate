// API使用量の記録 + 月間上限の判定
// 各 API 呼び出しの直後に logUsage() を呼ぶことで、
// /admin/costs ダッシュボードに反映される。
// 月間上限超過時は試着・LoRA訓練をブロックする。

import { createSupabaseServerClient } from './supabase/server'
import { checkAdmin } from './admin'
import {
  SERVICE_COSTS_JPY,
  DEFAULT_MONTHLY_CAP_JPY,
  type ServiceId,
} from './usage-cost-constants'

// 定数を再エクスポート（既存 import 経路を壊さないため）
export { SERVICE_COSTS_JPY, DEFAULT_MONTHLY_CAP_JPY, type ServiceId }

// ─── 利用ログを書き込む ───
export async function logUsage(input: {
  service: ServiceId
  operation?: string
  costJpyOverride?: number // 実コスト確定後に上書きする場合
  tokensIn?: number
  tokensOut?: number
  externalId?: string
  meta?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return // 未認証 → 記録しない

    const cost = input.costJpyOverride ?? SERVICE_COSTS_JPY[input.service] ?? 0

    await supabase.from('api_usage_logs').insert({
      user_id: user.id,
      service: input.service,
      operation: input.operation,
      cost_jpy: cost,
      tokens_in: input.tokensIn,
      tokens_out: input.tokensOut,
      external_id: input.externalId,
      meta: input.meta,
    })
  } catch (e) {
    // ログ失敗は本処理を止めない（観測性 vs 可用性のトレードオフでは可用性優先）
    console.warn('[usage-log] failed:', e)
  }
}

// ─── 当月の使用量を計算 ───
export async function getUserMonthlyUsage(userId?: string): Promise<{
  total: number
  byService: Record<string, number>
}> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const targetId = userId || user?.id
  if (!targetId) return { total: 0, byService: {} }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('api_usage_logs')
    .select('service, cost_jpy')
    .eq('user_id', targetId)
    .gte('created_at', startOfMonth.toISOString())

  if (!data) return { total: 0, byService: {} }

  const byService: Record<string, number> = {}
  let total = 0
  for (const log of data) {
    const cost = Number(log.cost_jpy) || 0
    total += cost
    byService[log.service] = (byService[log.service] || 0) + cost
  }
  return { total, byService }
}

// ─── 月間上限の状態を取得 ───
export interface CapStatus {
  cap: number
  used: number
  remaining: number
  ratio: number // 0.0 - 2.0+ (1.0 = ちょうど上限)
  warningLevel: 0 | 1 | 2 // 0:OK / 1:80%警告 / 2:超過ブロック
  isAdmin: boolean
}

export async function getCapStatus(): Promise<CapStatus> {
  const admin = await checkAdmin()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      cap: 0,
      used: 0,
      remaining: 0,
      ratio: 1,
      warningLevel: 2,
      isAdmin: false,
    }
  }

  // 個別の上書きキャップ
  const { data: profile } = await supabase
    .from('profiles')
    .select('monthly_cap_jpy_override')
    .eq('id', user.id)
    .maybeSingle()

  const cap =
    Number(profile?.monthly_cap_jpy_override) ||
    (admin.isAdmin ? DEFAULT_MONTHLY_CAP_JPY.admin : DEFAULT_MONTHLY_CAP_JPY.user)

  const { total: used } = await getUserMonthlyUsage(user.id)
  const remaining = Math.max(0, cap - used)
  const ratio = cap > 0 ? used / cap : 1
  const warningLevel: 0 | 1 | 2 = ratio >= 1 ? 2 : ratio >= 0.8 ? 1 : 0

  return {
    cap,
    used,
    remaining,
    ratio,
    warningLevel,
    isAdmin: admin.isAdmin,
  }
}

// ─── 有料API呼び出し前の検査（超過なら例外を投げる） ───
export async function assertWithinMonthlyCap(serviceCost: number): Promise<void> {
  const status = await getCapStatus()
  if (status.used + serviceCost > status.cap) {
    const err = new Error(
      `今月の使用上限（${status.cap.toLocaleString()}円）に達しました。来月までお待ちください。`
    )
    // @ts-expect-error 独自プロパティ
    err.code = 'monthly_cap_exceeded'
    throw err
  }
}
