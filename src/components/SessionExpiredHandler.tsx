'use client'

// 各 server action が `code: 'session_expired'` を返した時、
// ユーザーに「再ログインしてください」モーダルを表示する。
//
// 仕組み：カスタムイベント `stylemate:session-expired` をリッスン。
// クライアント側ヘルパー triggerSessionExpired() で発火する。

import { useEffect, useState } from 'react'

export default function SessionExpiredHandler() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string } | undefined
      setMessage(detail?.message || 'セッションが切れました。再ログインしてください。')
      setOpen(true)
    }
    window.addEventListener('stylemate:session-expired', handler)
    return () => window.removeEventListener('stylemate:session-expired', handler)
  }, [])

  if (!open) return null

  return (
    <div
      role="dialog"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          maxWidth: 360,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔒</div>
        <h2 style={{ fontSize: '1.05rem', color: '#333', fontWeight: 800, marginBottom: 8 }}>
          ログインが切れました
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.6, marginBottom: 20 }}>
          {message}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a
            href="/login"
            style={{
              display: 'block',
              background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
              color: '#fff',
              padding: '12px 0',
              borderRadius: 14,
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.95rem',
            }}
          >
            再ログイン →
          </a>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#999',
              fontSize: '0.8rem',
              padding: 6,
              cursor: 'pointer',
            }}
          >
            あとで
          </button>
        </div>
      </div>
    </div>
  )
}

// 任意のクライアントコードから session_expired を発火させる
export function triggerSessionExpired(message?: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('stylemate:session-expired', { detail: { message } })
  )
}

// Server Action の結果を受け取り、session_expired なら自動でモーダル発火
export function handleActionResult<T extends { code?: string; userMessage?: string; ok: boolean }>(
  result: T
): T {
  if (!result.ok && result.code === 'session_expired') {
    triggerSessionExpired(result.userMessage)
  }
  return result
}
