// 試着：友人 + 服を選んで /tryon/[friendId]/generate に進む
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getFriend } from '@/lib/friends'
import { listClothes } from '@/lib/clothes'
import TryonClothingPicker from '@/components/TryonClothingPicker'

export default async function TryonSelectPage({
  params,
}: {
  params: Promise<{ friendId: string }>
}) {
  const { friendId } = await params
  const [friend, clothes] = await Promise.all([getFriend(friendId), listClothes()])
  if (!friend) notFound()

  // 試着に使える服のみ（image_url が必須）
  const usableClothes = clothes.filter((c) => !!c.image_url)

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
        <Link href={`/friends/${friendId}`} style={{ color: '#999', fontSize: '1.2rem' }}>
          ‹
        </Link>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#333', marginLeft: 14 }}>
          {friend.name} にオンライン試着
        </h1>
      </header>

      <div style={{ padding: '20px 16px' }}>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 16 }}>
          着せたい服を選んでください
        </p>

        {usableClothes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>👗</div>
            <p style={{ color: '#999', fontSize: '0.85rem', marginBottom: 4 }}>
              オンライン試着できる服がありません
            </p>
            <p style={{ color: '#bbb', fontSize: '0.72rem', marginBottom: 20 }}>
              ※ オンライン試着には画像つきの服が必要です
            </p>
            <Link
              href="/register"
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
              服を登録する（楽天検索）
            </Link>
          </div>
        ) : (
          <TryonClothingPicker friendId={friendId} clothes={usableClothes} />
        )}
      </div>
    </div>
  )
}
