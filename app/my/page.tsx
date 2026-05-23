import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getStyleProfile } from '@/lib/style'
import { signOut } from '../auth/actions'

export default async function MyPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const styleProfile = await getStyleProfile()

  return (
    <div style={{ padding: '24px 16px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333', marginBottom: 20 }}>
        マイページ
      </h1>

      {/* プロフィールカード */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #F5C6D8',
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E8A0BF, #BAD7E9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {(user?.email?.[0] || '?').toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#333',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.email}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#999', marginTop: 2 }}>
            ログイン中
          </div>
        </div>
      </div>

      {/* 嗜好カード */}
      <Link
        href="/style"
        style={{
          display: 'block',
          background:
            styleProfile && styleProfile.tags.length > 0
              ? 'linear-gradient(135deg, #FFF0F6, #FFE4F0)'
              : '#fff',
          border: '1px solid #FFE4F0',
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: '1.2rem' }}>💞</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#333' }}>
            あなたの嗜好
          </span>
          <span style={{ marginLeft: 'auto', color: '#bbb', fontSize: '1rem' }}>›</span>
        </div>
        {styleProfile && styleProfile.tags.length > 0 ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {styleProfile.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    background: '#fff',
                    color: '#C4779B',
                    border: '1px solid #E8A0BF',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 12,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            {styleProfile.summary && (
              <p style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.5 }}>
                {styleProfile.summary}
              </p>
            )}
          </>
        ) : (
          <p style={{ fontSize: '0.78rem', color: '#999', lineHeight: 1.5 }}>
            服をスワイプして好みを教えると、AI コーデ提案の精度が上がります
          </p>
        )}
      </Link>

      {/* メニュー（Phase ごとに増やす） */}
      <section style={{ marginBottom: 20 }}>
        <h2
          style={{
            fontSize: '0.7rem',
            color: '#999',
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            paddingLeft: 4,
            marginBottom: 8,
          }}
        >
          設定
        </h2>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #F5C6D8' }}>
          <MenuLink icon="📅" label="着用カレンダー" href="/calendar" />
          <MenuRow icon="📜" label="利用規約" disabled hint="準備中" />
          <MenuRow icon="🔒" label="プライバシーポリシー" disabled hint="準備中" />
          <MenuRow icon="❓" label="ヘルプ" disabled hint="準備中" last />
        </div>
      </section>

      {/* ログアウト */}
      <form action={signOut}>
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '14px',
            background: '#fff',
            border: '2px solid #ddd',
            color: '#999',
            borderRadius: 12,
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ログアウト
        </button>
      </form>
    </div>
  )
}

function MenuLink({
  icon,
  label,
  href,
  last,
}: {
  icon: string
  label: string
  href: string
  last?: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '14px 16px',
        borderBottom: last ? 'none' : '1px solid #F5C6D8',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <span style={{ fontSize: '1.1rem', marginRight: 12 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: '0.9rem', color: '#333' }}>{label}</span>
      <span style={{ color: '#bbb', fontSize: '1rem' }}>›</span>
    </Link>
  )
}

function MenuRow({
  icon,
  label,
  disabled,
  hint,
  last,
}: {
  icon: string
  label: string
  disabled?: boolean
  hint?: string
  last?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '14px 16px',
        borderBottom: last ? 'none' : '1px solid #F5C6D8',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ fontSize: '1.1rem', marginRight: 12 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: '0.9rem', color: '#333' }}>{label}</span>
      {hint && (
        <span style={{ fontSize: '0.7rem', color: '#bbb' }}>{hint}</span>
      )}
    </div>
  )
}
