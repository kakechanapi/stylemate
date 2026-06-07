// 管理者判定
// 2段階で判定する：
// 1. 環境変数 ADMIN_EMAILS（カンマ区切り）に登録されたメアド → 初期管理者
// 2. profiles.is_admin = TRUE → DBで動的に管理者を追加できる
// 将来 /admin/users から「管理者にする」ボタンで追加できるよう柔軟性を確保

import { createSupabaseServerClient } from './supabase/server'

export interface AdminCheck {
  isAdmin: boolean
  userId: string | null
  email: string | null
}

export async function checkAdmin(): Promise<AdminCheck> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { isAdmin: false, userId: null, email: null }

  // 1) 環境変数チェック
  const envEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (user.email && envEmails.includes(user.email.toLowerCase())) {
    // 環境変数管理者は profiles.is_admin も自動で TRUE にしておく
    // （ダッシュボードの RLS で使われるため）
    void supabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', user.id)
      .then(() => {})
    return { isAdmin: true, userId: user.id, email: user.email }
  }

  // 2) DB の is_admin を見る
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  return {
    isAdmin: !!data?.is_admin,
    userId: user.id,
    email: user.email || null,
  }
}

export async function requireAdmin(): Promise<AdminCheck> {
  const check = await checkAdmin()
  if (!check.isAdmin) {
    throw new Error('管理者権限が必要です')
  }
  return check
}
