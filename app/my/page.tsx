// マイページ：自分のプロフィール + 嗜好 + 会う相手 + 設定
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getStyleProfile } from '@/lib/style'
import { listFriends } from '@/lib/friends'
import { signOut } from '../auth/actions'

export default async function MyPage() {
  const supabase = await createSupabaseServerClient()

  const [userRes, styleProfile, friends] = await Promise.all([
    supabase.auth.getUser(),
    getStyleProfile(),
    listFriends(),
  ])
  const user = userRes.data.user

  // 「自分」と「会う相手」を分離
  const me = friends.find((f) => f.is_me) || null
  const others = friends.filter((f) => !f.is_me)

  return (
    <div style={{ padding: '24px 16px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333', marginBottom: 20 }}>
        マイ
      </h1>

      {/* ─── 自分プロフィール ─── */}
      <Link
        href={me ? `/friends/${me.id}` : '/friends/new?me=1'}
        style={{
          display: 'block',
          background: 'linear-gradient(135deg, #FFF0F6, #FFE4F0)',
          border: '1px solid #F5C6D8',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background:
                me?.thumb_url
                  ? `url(${me.thumb_url}) center/cover`
                  : 'linear-gradient(135deg, #E8A0BF, #BAD7E9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              color: '#fff',
              flexShrink: 0,
              fontWeight: 700,
            }}
          >
            {!me?.thumb_url && (me?.name?.[0] || user?.email?.[0] || '?').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {me ? (
              <>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#333' }}>
                  {me.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#999', marginTop: 2 }}>
                  {me.height_cm ? `${me.height_cm}cm` : '身長未入力'} ·{' '}
                  {me.body_type || '体型未設定'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#bbb', marginTop: 2 }}>
                  📸 {me.face_photo_count}枚
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#333' }}>
                  自分を登録する
                </div>
                <div style={{ fontSize: '0.72rem', color: '#999', marginTop: 2 }}>
                  身長・体型・写真を登録してください
                </div>
              </>
            )}
          </div>
          <span style={{ color: '#bbb', fontSize: '1.2rem' }}>›</span>
        </div>
        {user?.email && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: '1px solid rgba(196,121,155,0.2)',
              fontSize: '0.7rem',
              color: '#999',
            }}
          >
            ✉ {user.email}
          </div>
        )}
      </Link>

      {/* ─── 嗜好カード ─── */}
      <Link
        href="/style"
        style={{
          display: 'block',
          background:
            styleProfile && styleProfile.tags.length > 0
              ? '#fff'
              : '#fff',
          border: '1px solid #FFE4F0',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
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
                    background: '#FFF0F6',
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

      {/* ─── 会う相手（被り回避用） ─── */}
      <Link
        href="/friends"
        style={{
          display: 'block',
          background: '#fff',
          border: '1px solid #FFE4F0',
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.2rem' }}>🙂</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#333' }}>
              会う相手
            </div>
            <div style={{ fontSize: '0.7rem', color: '#999', marginTop: 2 }}>
              {others.length}人 登録 · 被り回避コーデ提案に使われます
            </div>
          </div>
          <span style={{ color: '#bbb', fontSize: '1rem' }}>›</span>
        </div>
      </Link>

      {/* ─── 設定 ─── */}
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
