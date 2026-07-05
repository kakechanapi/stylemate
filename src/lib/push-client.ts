// Web Push のクライアント側ヘルパー（ブラウザ専用）
// - iOS は「ホーム画面に追加」した PWA でのみ Push が使える（16.4+）
// - Android Chrome / デスクトップはそのまま使える

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

/** ホーム画面から起動された PWA かどうか */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari 独自プロパティ
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

/** 既存の購読を返す（なければ null） */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return null
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

/**
 * 通知許可 → SW 登録 → Push 購読 → サーバー保存 まで一気にやる。
 * 戻り値 ok=false のときは error にユーザー向けメッセージ。
 */
export async function subscribeToPush(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: 'この端末・ブラウザは通知に対応していません。' }
  }
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    return { ok: false, error: '通知の設定がまだ準備できていません。' }
  }
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return {
        ok: false,
        error: '通知が許可されませんでした。端末の設定から変更できます。',
      }
    }
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub =
      existing ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      }))

    const json = sub.toJSON()
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: data.userMessage || '購読の保存に失敗しました。' }
    }
    return { ok: true }
  } catch (e) {
    console.error('[push-client] subscribe error:', e)
    return { ok: false, error: '通知の設定に失敗しました。時間をおいてお試しください。' }
  }
}

/** 購読解除（ブラウザ側 + サーバー側の両方を削除） */
export async function unsubscribePush(): Promise<{ ok: boolean }> {
  try {
    const sub = await getExistingSubscription()
    if (sub) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
    }
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
