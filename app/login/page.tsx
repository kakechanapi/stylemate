'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

function LoginInner() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || sending) return
    setSending(true)
    setError('')

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // メール内リンクの遷移先（クリックすると Supabase が
        // /auth/callback?code=xxx に飛ばし、サーバー側でセッション化）
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    })

    if (error) {
      setError(error.message)
      setSending(false)
    } else {
      setSent(true)
      setSending(false)
    }
  }

  return (
    <div style={{ padding: '40px 24px', maxWidth: 400, margin: '0 auto' }}>
      {/* ロゴ・タイトル */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>👗</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#333', marginBottom: 6 }}>
          ようこそ
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#999' }}>
          メールでログインしましょう
        </p>
      </div>

      {sent ? (
        // 送信完了画面
        <div
          style={{
            background: '#fff',
            border: '2px solid #E8A0BF',
            borderRadius: 16,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#333', marginBottom: 8 }}>
            メールを送信しました
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.6 }}>
            <b style={{ color: '#C4779B' }}>{email}</b> 宛に
            <br />
            ログイン用のリンクを送りました。
            <br />
            メール内のボタンを押して続行してください。
          </p>
          <button
            onClick={() => {
              setSent(false)
              setEmail('')
            }}
            style={{
              marginTop: 20,
              background: 'transparent',
              border: 'none',
              color: '#999',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            別のメールアドレスで送り直す
          </button>
        </div>
      ) : (
        // 入力フォーム
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginBottom: 6, fontWeight: 600 }}>
            メールアドレス
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={sending}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '2px solid #F5C6D8',
              borderRadius: 12,
              fontSize: '1rem',
              boxSizing: 'border-box',
            }}
          />

          {error && (
            <p style={{ color: '#d63384', fontSize: '0.78rem', marginTop: 10, lineHeight: 1.5 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={sending || !email.trim()}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '14px',
              background:
                sending || !email.trim()
                  ? '#ddd'
                  : 'linear-gradient(135deg, #E8A0BF, #C4779B)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: '1rem',
              fontWeight: 700,
              cursor: sending || !email.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? '送信中…' : 'ログインリンクを送る'}
          </button>

          <p style={{ marginTop: 16, fontSize: '0.72rem', color: '#999', textAlign: 'center', lineHeight: 1.6 }}>
            初めての方も、メアドだけでOK。
            <br />
            送られてきたメールのリンクをタップしてログインします。
          </p>
        </form>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}
