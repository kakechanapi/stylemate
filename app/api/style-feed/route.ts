// Phase 8: スワイプ用の服画像フィード
// マルチソース基盤（楽天/Yahoo）経由でランダムな服を返す。
// 性別に応じて楽天のジャンルを絞ることで、異性向けや非衣類のノイズを減らす。

import { NextResponse } from 'next/server'
import { searchProducts } from '@/lib/product-search'
import { toGenderFilter } from '@/lib/product-search/types'
import { getMe } from '@/lib/friends'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// 性別別のキーワード候補
// 共通キーワードは両方で再利用、性別寄りのキーワードはどちらかに偏らせる
const COMMON_KEYWORDS = [
  'ニット', 'デニム', 'ジャケット', 'パンツ', 'シャツ', 'コート', 'カーディガン',
]
const FEMALE_EXTRA = ['ワンピース', 'ブラウス', 'スカート', 'プリーツスカート']
const MALE_EXTRA = ['パーカー', 'スウェット', 'チノパン', 'スラックス']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function GET(request: Request) {
  // 認証必須：楽天 API のレート制限保護（products/search と同じ理由）
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  // 性別フィルタ：クエリ優先 → 未指定なら自分のプロフィールから
  const qGender = searchParams.get('gender')
  let gender: ReturnType<typeof toGenderFilter> = undefined
  if (qGender === 'female' || qGender === 'male') {
    gender = qGender
  } else {
    const me = await getMe()
    gender = toGenderFilter(me?.gender)
  }

  // 性別に応じたキーワードプールを構築
  const pool =
    gender === 'female'
      ? [...COMMON_KEYWORDS, ...FEMALE_EXTRA]
      : gender === 'male'
      ? [...COMMON_KEYWORDS, ...MALE_EXTRA]
      : [...COMMON_KEYWORDS, ...FEMALE_EXTRA, ...MALE_EXTRA]

  // 3カテゴリからランダムに引いて混ぜる
  const picks = shuffle(pool).slice(0, 3)
  const results = await Promise.all(
    picks.map((k) => searchProducts(k, { gender, perSourceLimit: 10, totalLimit: 10 }))
  )
  const merged = shuffle(results.flatMap((r) => r.items)).slice(0, 20)
  // 画像URLがあるものだけ（既に filterClothingOnly 済）
  const usable = merged.filter((p) => p.imageUrl)
  return NextResponse.json(usable, {
    headers: {
      'X-Style-Feed-Gender': gender || 'all',
    },
  })
}
