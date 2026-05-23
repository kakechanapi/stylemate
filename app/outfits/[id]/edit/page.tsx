// 着用記録の編集（既存記録の内訳を見て編集できる）
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOutfit } from '@/lib/outfits'
import { listClothes } from '@/lib/clothes'
import { listFriends } from '@/lib/friends'
import EditOutfitForm from '@/components/EditOutfitForm'

export default async function EditOutfitPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [outfit, clothes, friends] = await Promise.all([
    getOutfit(id),
    listClothes(),
    listFriends(),
  ])
  if (!outfit) notFound()

  return (
    <div>
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
        <Link href="/events" style={{ color: '#999', fontSize: '1.2rem' }}>
          ‹
        </Link>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#333', marginLeft: 14 }}>
          着用記録を編集
        </h1>
      </header>

      <div style={{ padding: '20px 16px' }}>
        <EditOutfitForm
          outfit={outfit}
          clothes={clothes}
          friends={friends.map((f) => ({ id: f.id, name: f.name }))}
        />
      </div>
    </div>
  )
}
