// Push 購読の保存・削除
// POST   : { endpoint, p256dh, auth } を upsert（同じ端末の再購読は上書き）
// DELETE : { endpoint } を削除

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  }

  const { endpoint, p256dh, auth } = (await request.json()) as {
    endpoint?: string
    p256dh?: string
    auth?: string
  }
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: 'missing fields', userMessage: '購読情報が不正です。' },
      { status: 400 }
    )
  }

  // endpoint 一意で upsert。端末を別アカウントで使い直した場合も
  // user_id が新しい持ち主に付け替わる
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: request.headers.get('user-agent')?.slice(0, 255) || null,
      },
      { onConflict: 'endpoint' }
    )

  if (error) {
    console.error('[push/subscribe] upsert error:', error.message)
    return NextResponse.json(
      { error: error.message, userMessage: '購読の保存に失敗しました。' },
      { status: 500 }
    )
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  }

  const { endpoint } = (await request.json()) as { endpoint?: string }
  if (!endpoint) {
    return NextResponse.json({ error: 'missing endpoint' }, { status: 400 })
  }

  // RLS により自分の購読しか消せない
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
