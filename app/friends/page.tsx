// 会う相手の一覧（被り回避コーデ提案に紐付ける人物）
// 注：「自分」は is_me=true で別管理 → マイページから操作
import Link from 'next/link'
import { listFriendsWithLastMet } from '@/lib/friends'
import FriendCard from '@/components/FriendCard'

export default async function FriendsPage() {
  const all = await listFriendsWithLastMet()
  // 「自分」を除いた人だけ表示
  const friends = all.filter((f) => !f.is_me)

  return (
    <div style={{ padding: '20px 16px' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 16,
          gap: 10,
        }}
      >
        <Link
          href="/my"
          style={{
            color: '#999',
            fontSize: '1.2rem',
            textDecoration: 'none',
            padding: '0 4px',
          }}
        >
          ‹
        </Link>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333', flex: 1 }}>
          会う相手
        </h1>
        <Link
          href="/friends/new"
          style={{
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            color: '#fff',
            borderRadius: 20,
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          ＋ 追加
        </Link>
      </header>

      <div style={{ background: '#FFF5F8', borderRadius: 12, padding: 12, marginBottom: 20 }}>
        <p style={{ fontSize: '0.75rem', color: '#999', lineHeight: 1.6 }}>
          よく会う人を登録すると、AI が**「前回その人と着た服と被らない」**コーデを提案します。
          顔写真は<b>任意</b>（オンライン試着で使う。複数枚あるとよりリアルに）。
        </p>
      </div>

      <p style={{ fontSize: '0.8rem', color: '#bbb', marginBottom: 12 }}>
        {friends.length}人 登録
      </p>

      {friends.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🙂</div>
          <p style={{ color: '#999', fontSize: '0.85rem', marginBottom: 4 }}>
            まだ登録がありません
          </p>
          <p style={{ color: '#bbb', fontSize: '0.72rem', marginBottom: 20 }}>
            予定タブで「誰と会う」を登録する時に使えます
          </p>
          <Link
            href="/friends/new"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
              color: '#fff',
              borderRadius: 24,
              padding: '12px 28px',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
            }}
          >
            会う相手を追加
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {friends.map((f) => (
            <FriendCard key={f.id} friend={f} />
          ))}
        </div>
      )}
    </div>
  )
}
