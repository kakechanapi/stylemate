// Phase 8: スワイプ用の服画像フィード
// 楽天検索を内部で叩いてランダムな服を返す（demoでも動く）

import { NextResponse } from 'next/server'
import { searchRakutenFashion } from '@/lib/rakuten'

const KEYWORDS = [
  'ワンピース',
  'ニット',
  'デニム',
  'ブラウス',
  'スカート',
  'カーディガン',
  'ジャケット',
  'パンツ',
  'シャツ',
  'コート',
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function GET() {
  // 3カテゴリからランダムに引いて混ぜる
  const picks = shuffle(KEYWORDS).slice(0, 3)
  const results = await Promise.all(picks.map((k) => searchRakutenFashion(k)))
  const merged = shuffle(results.flat()).slice(0, 20)
  // 画像URLがあるものだけ
  const usable = merged.filter((p) => p.imageUrl)
  return NextResponse.json(usable)
}
