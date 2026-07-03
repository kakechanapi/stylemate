// オンボーディング（初回ログイン後の一本道）
// ホーム（app/page.tsx）が「服0着 & 未訪問」の時だけここへリダイレクトしてくる。
// 直接アクセスも可（やり直したい人向け）。服が既に十分あればホームへ返す。
import { redirect } from 'next/navigation'
import { countClothes } from '@/lib/clothes'
import { getMe } from '@/lib/friends'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  const [clothesCount, me] = await Promise.all([countClothes(), getMe()])

  // 既にクローゼットが育っている人にオンボーディングは不要
  if (clothesCount >= 3) {
    redirect('/')
  }

  return <OnboardingClient hasMe={!!me} initialClothesCount={clothesCount} />
}
