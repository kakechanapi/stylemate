// クローゼットアイテムの編集
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import EditClothingForm from '@/components/EditClothingForm'

export default async function EditClothingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: item } = await supabase
    .from('clothes')
    .select('*')
    .eq('id', id)
    .single()
  if (!item) notFound()

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
        <Link href="/closet" style={{ color: '#999', fontSize: '1.2rem' }}>
          ‹
        </Link>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#333', marginLeft: 14 }}>
          アイテムを編集
        </h1>
      </header>

      <div style={{ padding: '20px 16px' }}>
        <EditClothingForm item={item} />
      </div>
    </div>
  )
}
