// メール内マジックリンクが指す URL。
// `?code=xxx` を受け取り、Supabase でセッションに交換 → 元の遷移先に飛ばす。

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${url.origin}${next}`)
    }
    console.error('[/auth/callback] exchange failed:', error.message)
  }

  // 失敗時はログイン画面に戻す
  return NextResponse.redirect(`${url.origin}/login?error=auth_failed`)
}
