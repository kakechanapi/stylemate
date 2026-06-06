// 友人詳細：
// - is_me=true → 既存ビュー（スペック表示 + 本人モード/LoRA 起動UI）
// - is_me=false → 編集フォーム（写真・名前・性別・誕生日・関係性・メモ）
//   友達は試着・本人モードを使わない方針のため、LoRA UI は出さない。

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getFriend } from '@/lib/friends'
import LoraTrainingFlow from '@/components/LoraTrainingFlow'
import FriendEditForm from '@/components/FriendEditForm'

export default async function FriendDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const friend = await getFriend(id)
  if (!friend) notFound()

  return (
    <div style={{ padding: 0 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: '1px solid #FFE4F0',
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Link href="/friends" style={{ color: '#999', fontSize: '1.2rem' }}>
          ‹
        </Link>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#333', marginLeft: 14 }}>
          {friend.is_me ? friend.name : `${friend.name} を編集`}
        </h1>
      </header>

      <div style={{ padding: '24px 20px' }}>
        {/* 友達（is_me=false）：編集フォームを表示 */}
        {!friend.is_me && <FriendEditForm friend={friend} />}

        {/* 自分（is_me=true）：既存のスペック表示 + LoRA 起動 UI */}
        {friend.is_me && (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#FFF0F6',
                  border: '3px solid #fff',
                  boxShadow: '0 4px 12px rgba(232,160,191,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {friend.thumb_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={friend.thumb_url}
                    alt={friend.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '3rem' }}>🙂</span>
                )}
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#333', marginTop: 12 }}>
                {friend.name}
              </h2>
              <span
                style={{
                  background: '#E8A0BF',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 8,
                  marginTop: 6,
                }}
              >
                自分
              </span>
            </div>

            <div
              style={{
                background: '#fff',
                border: '1px solid #FFE4F0',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Row label="身長" value={friend.height_cm ? `${friend.height_cm}cm` : '—'} />
              <Row label="体型" value={friend.body_type || '—'} />
              <Row label="性別" value={friend.gender || '—'} />
              <Row label="誕生日" value={friend.birthday || '—'} />
              <Row label="関係性" value={friend.relationship || '—'} last />
            </div>

            {friend.note && (
              <div
                style={{
                  background: '#FFF8FB',
                  border: '1px solid #FFE4F0',
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: '0.7rem', color: '#C4779B', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
                  📝 メモ
                </div>
                <p style={{ fontSize: '0.85rem', color: '#444', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {friend.note}
                </p>
              </div>
            )}

            <Link
              href={`/tryon/${friend.id}`}
              style={{
                display: 'block',
                background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
                color: '#fff',
                borderRadius: 16,
                padding: 16,
                fontWeight: 700,
                fontSize: '0.95rem',
                textAlign: 'center',
                textDecoration: 'none',
                marginBottom: 16,
                boxShadow: '0 4px 14px rgba(196,121,155,0.3)',
              }}
            >
              👗 服を試着する
            </Link>

            <div
              style={{
                background: '#fff',
                border: '1px solid #FFE4F0',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  marginBottom: 6,
                }}
              >
                <span style={{ color: '#666' }}>写真登録枚数</span>
                <span style={{ color: '#333', fontWeight: 700 }}>{friend.face_photo_count}枚</span>
              </div>
            </div>

            <LoraTrainingFlow
              friendId={friend.id}
              friendName={friend.name}
              photoCount={friend.face_photo_count}
              initialStatus={friend.lora_status}
              initialTrainingId={friend.lora_training_id}
            />
          </>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: last ? 'none' : '1px solid #FFE4F0',
        fontSize: '0.85rem',
      }}
    >
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ color: '#333', fontWeight: 600 }}>{value}</span>
    </div>
  )
}
