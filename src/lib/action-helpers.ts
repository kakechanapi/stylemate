// Server Action 共通ヘルパー
// - 認証エラーを統一的に検出し、フロントが「再ログインを促す」UI を出せるようにする
// - 各 lib 関数は `{ ok: false, error: 'not authenticated' }` を返す慣習なので、
//   それを `{ code: 'session_expired', userMessage: '再ログインしてください' }` に正規化する

import { createSupabaseServerClient } from './supabase/server'

export type ActionErrorCode =
  | 'session_expired'
  | 'monthly_cap_exceeded'
  | 'forbidden'
  | 'unknown'

export interface ActionResult<T = unknown> {
  ok: boolean
  error?: string // 開発者向け生エラー
  code?: ActionErrorCode // フロントが分岐するためのコード
  userMessage?: string // ユーザー向け表示メッセージ
  data?: T
}

// 認証チェック。ユーザーが取れなければ session_expired の ActionResult を返す。
export async function getAuthedUserOrError(): Promise<
  | { ok: true; userId: string; email: string | null }
  | (ActionResult & { ok: false })
> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      error: 'not authenticated',
      code: 'session_expired',
      userMessage: 'セッションが切れました。お手数ですが再ログインしてください。',
    }
  }
  return { ok: true, userId: user.id, email: user.email || null }
}

// lib からの結果を ActionResult 形式に正規化する
// - error が "not authenticated" 系なら session_expired にラベル付け
// - その他のエラーは userMessage を埋める
export function normalizeActionResult<T extends { ok: boolean; error?: string }>(
  result: T,
  opts?: { fallbackMessage?: string }
): T & { code?: ActionErrorCode; userMessage?: string } {
  if (result.ok) return result
  const err = (result.error || '').toLowerCase()
  if (err.includes('not authenticated') || err.includes('jwt') || err.includes('session')) {
    return {
      ...result,
      code: 'session_expired' as ActionErrorCode,
      userMessage: 'セッションが切れました。お手数ですが再ログインしてください。',
    }
  }
  return {
    ...result,
    userMessage: result.error || opts?.fallbackMessage || '保存に失敗しました',
  }
}
