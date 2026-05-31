'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

function LoginInner() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const urlError = searchParams.get('error')

  // URLパラメータから来たエラーをユーザー向け文言に変換
  const urlErrorMessage =
    urlError === 'auth_failed'
      ? 'ログイン処理が失敗しました。リンクが期限切れの可能性があります。もう一度メールを送信してください。'
      : urlError
        ? `エラー: ${urlError}`
        : ''

  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(urlErrorMessage)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleLogin = async () => {
    if (googleLoading) return
    setGoogleLoading(true)
    setError('')
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // 成功時はブラウザが Google にリダイレクトするので setGoogleLoading は false にしない
  }

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
        <>
          {/* Google ログインボタン */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{
              width: '100%',
              padding: '14px',
              background: '#fff',
              border: '2px solid #ddd',
              borderRadius: 12,
              fontSize: '1rem',
              fontWeight: 600,
              color: '#333',
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 20,
              boxSizing: 'border-box',
            }}
          >
            {/* Google ロゴ（SVG inline） */}
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917"
              />
              <path
                fill="#FF3D00"
                d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44"
              />
              <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917"
              />
            </svg>
            {googleLoading ? 'Google にリダイレクト中…' : 'Google でログイン'}
          </button>

          {/* 区切り */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
              color: '#bbb',
              fontSize: '0.75rem',
            }}
          >
            <div style={{ flex: 1, height: 1, background: '#eee' }} />
            <span>または</span>
            <div style={{ flex: 1, height: 1, background: '#eee' }} />
          </div>

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
        </>
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
