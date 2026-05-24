// クローゼット：Supabase から自分の服一覧を読む（Server Component）
// 全件取得まで Server で、フィルタは Client（即時切替・ネットワーク往復なし）
import ClosetClient from '@/components/ClosetClient'
import { listClothes } from '@/lib/clothes'

export default async function ClosetPage() {
  const items = await listClothes()
  return <ClosetClient items={items} />
}
