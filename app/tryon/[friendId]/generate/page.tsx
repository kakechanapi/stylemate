// 試着生成 + 結果表示
import { notFound, redirect } from 'next/navigation'
import { getFriend } from '@/lib/friends'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import TryonGenerator from '@/components/TryonGenerator'

export default async function TryonGeneratePage({
  params,
  searchParams,
}: {
  params: Promise<{ friendId: string }>
  searchParams: Promise<{ clothingId?: string }>
}) {
  const { friendId } = await params
  const { clothingId } = await searchParams
  if (!clothingId) redirect(`/tryon/${friendId}`)

  const friend = await getFriend(friendId)
  if (!friend) notFound()

  const supabase = await createSupabaseServerClient()
  const { data: clothing } = await supabase
    .from('clothes')
    .select('*')
    .eq('id', clothingId)
    .single()
  if (!clothing) notFound()

  if (!friend.thumb_url) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ color: '#999', fontSize: '0.9rem' }}>
          {friend.name} の顔写真が登録されていないため試着できません。
          <br />
          友人ページから写真を追加してください。
        </p>
      </div>
    )
  }
  if (!clothing.image_url) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ color: '#999', fontSize: '0.9rem' }}>この服には画像がないため試着できません</p>
      </div>
    )
  }

  return (
    <TryonGenerator
      friendId={friendId}
      friendName={friend.name}
      humanImage={friend.thumb_url}
      clothingId={clothing.id}
      clothingImageUrl={clothing.image_url}
      clothingName={clothing.name}
      garmentDescription={`${clothing.color || ''} ${clothing.name}`.trim()}
    />
  )
}
