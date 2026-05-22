// 友人一覧（試着対象人物）
import Link from 'next/link'
import { listFriends } from '@/lib/friends'
import FriendCard from '@/components/FriendCard'

export default async function FriendsPage() {
  const friends = await listFriends()

  return (
    <div style={{ padding: '20px 16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333' }}>友人</h1>
          <p style={{ fontSize: '0.8rem', color: '#bbb' }}>{friends.length}人 登録</p>
        </div>
        <Link
          href="/friends/new"
          style={{
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            color: '#fff',
            borderRadius: 20,
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          ＋ 追加
        </Link>
      </div>

      <div style={{ background: '#FFF5F8', borderRadius: 12, padding: 12, marginBottom: 20 }}>
        <p style={{ fontSize: '0.75rem', color: '#999', lineHeight: 1.6 }}>
          試着対象の人物を登録します。複数枚の顔写真があると AI が「本人モード」で
          試着・コーデを生成できます（Phase 5 で起動）。
        </p>
      </div>

      {friends.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>👤</div>
          <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: 20 }}>
            まず自分を登録しましょう
          </p>
          <Link
            href="/friends/new?me=1"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
              color: '#fff',
              borderRadius: 24,
              padding: '12px 28px',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            自分を登録する
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {friends.map((f) => (
            <FriendCard key={f.id} friend={f} />
          ))}
        </div>
      )}
    </div>
  )
}
