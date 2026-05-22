import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signOut } from '../auth/actions'

export default async function MyPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
