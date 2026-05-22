// ホーム：Server Component で実データ取得し、Client に渡してインタラクション
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listClothes } from '@/lib/clothes'
import HomeClient from './HomeClient'

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const clothes = await listClothes()

  return (
    <HomeClient
      clothes={clothes}
      userEmail={user?.email || null}
    />
  )
}
