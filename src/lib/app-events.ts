// プロダクト計測イベントの記録（Server 専用）
// logUsage と同じ思想：失敗しても本処理を止めない。ただし Vercel の
// レスポンス後凍結で欠落しないよう、呼び出し側は await すること。
//
// テーブル：app_events（migration 0011）。未実行環境では insert が
// エラーになるが握りつぶすので機能影響はない。

import { createSupabaseServerClient } from './supabase/server'

export type AppEvent =
  | 'outfit_suggested'
  | 'outfit_confirmed'
  | 'cloth_registered'
  | 'tryon_generated'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'onboarding_skipped'

export async function logEvent(
  event: AppEvent,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return // 未認証は記録しない

    const { error } = await supabase.from('app_events').insert({
      user_id: user.id,
      event,
      meta: meta || null,
    })
    if (error) {
      // migration 0011 未実行などは警告のみ
      console.warn('[app-events] insert failed:', error.message)
    }
  } catch (e) {
    console.warn('[app-events] failed:', e)
  }
}
