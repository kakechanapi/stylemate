// Service Role クライアント（RLS をバイパスする管理用・Server 専用）
// 用途：Cron など「ユーザーセッションが存在しない」文脈での DB アクセス。
// 絶対にクライアントコンポーネントから import しないこと。

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
