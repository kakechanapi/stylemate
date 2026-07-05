'use client'

// 毎朝の通知セットアップカード
// 端末の状態で出し分ける：
//   1. すでに購読済み            → home では非表示 / settings では「オン」表示 + 解除
//   2. Push 対応ブラウザ          → 「毎朝7時に通知を受け取る」ボタン
//   3. iOS で未インストール       → 「ホーム画面に追加」ガイド（iOS は PWA でしか Push 不可）
//   4. 非対応                    → home では非表示 / settings では注記
//
// home バリアントは ✕ で消せる（localStorage）。しつこくしない。

import { useEffect, useState } from 'react'
import {
  isIOS,
  isStandalone,
  isPushSupported,
  getExistingSubscription,
  subscribeToPush,
  unsubscribePush,
} from '@/lib/push-client'

const DISMISS_KEY = 'stylemate:notif-card-dismissed'

type CardState =
  | 'loading'
  | 'subscribed'
  | 'can-subscribe'
  | 'ios-needs-install'
  | 'unsupported'

export default function NotificationSetupCard({
  variant,
}: {
  variant: 'home' | 'settings'
}) {
  const [state, setState] = useState<CardState>('loading')
  const [dismissed, setDismissed] = useState(true) // SSR とのちらつき防止で初期は隠す
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = async () => {
    try {
      // iOS は「ホーム画面に追加」済みでないと Push が動かない。
      // iOS 16.4+ の通常 Safari タブでも PushManager/Notification オブジェクト自体は
      // 存在することがあり、isPushSupported() を先に判定すると誤って
      // 「購読可能」扱いになってしまう。iOS かどうかを最優先でチェックする。
      if (isIOS() && !isStandalone()) {
        setState('ios-needs-install')
        return
      }
      if (isPushSupported()) {
        const sub = await getExistingSubscription()
        setState(sub ? 'subscribed' : 'can-subscribe')
      } else {
        setState('unsupported')
      }
    } catch (e) {
      // 何らかの例外で state が 'loading' のまま固まると home ではカードが
      // 永久に非表示になるため、必ずどこかの状態へ着地させる
      console.error('[NotificationSetupCard] refresh failed:', e)
      setState('unsupported')
    }
  }

  useEffect(() => {
    try {
      setDismissed(variant === 'home' && localStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
    void refresh()
  }, [variant])

  const handleSubscribe = async () => {
    setBusy(true)
    setError('')
    const result = await subscribeToPush()
    setBusy(false)
    if (result.ok) setState('subscribed')
    else setError(result.error || '設定に失敗しました')
  }

  const handleUnsubscribe = async () => {
    setBusy(true)
    await unsubscribePush()
    setBusy(false)
    setState('can-subscribe')
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {}
    setDismissed(true)
  }

  // home では：読み込み中・購読済み・非対応・✕済み → 何も出さない
  if (variant === 'home') {
    if (dismissed || state === 'loading' || state === 'subscribed' || state === 'unsupported') {
      return null
    }
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #FFE4F0',
    borderRadius: 16,
    padding: 14,
    marginTop: variant === 'home' ? 16 : 24,
    position: 'relative',
  }

  // ─── settings：状態表示つき ───
  if (variant === 'settings' && state === 'loading') {
    return null
  }
  if (variant === 'settings' && state === 'unsupported') {
    return (
      <section style={cardStyle}>
        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', margin: '0 0 4px' }}>
          ☀️ 毎朝のコーデ通知
        </p>
        <p style={{ fontSize: '0.72rem', color: '#999', margin: 0, lineHeight: 1.6 }}>
          この端末・ブラウザは通知に対応していません。
        </p>
      </section>
    )
  }
  if (state === 'subscribed') {
    // home では非表示（上で return 済み）なので settings のみ
    return (
      <section style={cardStyle}>
        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', margin: '0 0 4px' }}>
          ☀️ 毎朝のコーデ通知
        </p>
        <p style={{ fontSize: '0.75rem', color: '#0E9F6E', fontWeight: 700, margin: '0 0 10px' }}>
          ✓ オンになっています（毎朝 7時ごろ）
        </p>
        <button
          onClick={handleUnsubscribe}
          disabled={busy}
          style={{
            background: '#fff',
            color: '#999',
            border: '1.5px solid #ddd',
            borderRadius: 12,
            padding: '6px 14px',
            fontSize: '0.72rem',
            cursor: 'pointer',
          }}
        >
          {busy ? '処理中…' : '通知をオフにする'}
        </button>
      </section>
    )
  }

  return (
    <section style={cardStyle}>
      {variant === 'home' && (
        <button
          onClick={handleDismiss}
          aria-label="閉じる"
          style={{
            position: 'absolute',
            top: 8,
            right: 10,
            background: 'transparent',
            border: 'none',
            color: '#ccc',
            fontSize: '1rem',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          ✕
        </button>
      )}

      {state === 'can-subscribe' && (
        <>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333', margin: '0 0 4px' }}>
            ☀️ 毎朝7時、今日のコーデをお届け
          </p>
          <p style={{ fontSize: '0.72rem', color: '#888', margin: '0 0 10px', lineHeight: 1.6 }}>
            天気に合わせた通知が届きます。朝の服選びがゼロ秒に。
          </p>
          <button
            onClick={handleSubscribe}
            disabled={busy}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: 10,
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? '設定中…' : '🔔 通知を受け取る'}
          </button>
          {error && (
            <p style={{ fontSize: '0.7rem', color: '#C44', margin: '8px 0 0' }}>{error}</p>
          )}
        </>
      )}

      {state === 'ios-needs-install' && (
        <>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333', margin: '0 0 4px' }}>
            📲 ホーム画面に追加すると、毎朝の通知が使えます
          </p>
          <p style={{ fontSize: '0.72rem', color: '#888', margin: '0 0 10px', lineHeight: 1.6 }}>
            iPhone では、アプリとして追加した場合のみ通知を受け取れます。
          </p>
          <ol
            style={{
              margin: 0,
              paddingLeft: 20,
              fontSize: '0.75rem',
              color: '#555',
              lineHeight: 2,
            }}
          >
            <li>
              下の <b>共有ボタン</b>（
              <span style={{ display: 'inline-block', transform: 'translateY(1px)' }}>⬆️</span>
              ）をタップ
            </li>
            <li>
              <b>「ホーム画面に追加」</b>を選ぶ
            </li>
            <li>ホーム画面の StyleMate から開き直す → このカードから通知をオン</li>
          </ol>
        </>
      )}
    </section>
  )
}
