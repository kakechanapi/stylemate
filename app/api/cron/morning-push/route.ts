// 毎朝のコーデ通知（Vercel Cron から起動）
// vercel.json: "0 22 * * *"（UTC）= 毎朝 7:00 JST
// ※ Hobby プランの Cron は指定時刻から最大1時間ほど遅れることがある
//
// 認証：Vercel は CRON_SECRET 環境変数を設定しておくと
// `Authorization: Bearer <CRON_SECRET>` を自動付与してくる。
// 外部からの叩き逃げ（無料で全員に通知を送らせる等）をこれで防ぐ。
//
// 天気は東京固定（位置情報はサーバーに保存しない方針のため）。
// 通知はあくまで「開かせるフック」で、開いた後の提案は端末の位置情報を使う。

import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { fetchWeather } from '@/lib/weather'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: 'VAPID keys not set' }, { status: 500 })
  }
  webpush.setVapidDetails('mailto:kakeruha0602@gmail.com', publicKey, privateKey)

  const admin = createSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, message: 'no subscriptions' })
  }

  // 天気連動の文面（開封率を上げる一番の要素）
  const weather = await fetchWeather()
  const title = weather
    ? `${weather.icon} 今日は${weather.description}、${weather.temperature}℃`
    : '☀️ おはようございます'
  const body = weather?.clothingIndex
    ? `${weather.clothingIndex.recommendation}。今日のコーデ、AIが提案します`
    : '今日のコーデ、AIが提案します'

  const payload = JSON.stringify({ title, body, url: '/?suggest=1' })

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
    )
  )

  // 失効した購読（404/410）は掃除する
  const staleEndpoints: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const statusCode = (r.reason as { statusCode?: number })?.statusCode
      if (statusCode === 404 || statusCode === 410) {
        staleEndpoints.push(subs[i].endpoint)
      } else {
        console.warn('[morning-push] send failed:', statusCode, r.reason)
      }
    }
  })
  if (staleEndpoints.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', staleEndpoints)
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length
  console.log(`[morning-push] sent=${sent} stale=${staleEndpoints.length} total=${subs.length}`)
  return NextResponse.json({
    sent,
    cleaned: staleEndpoints.length,
    total: subs.length,
  })
}

export const maxDuration = 60
