// 商品検索 API
// マルチソース対応：楽天 / Yahoo!ショッピング / 将来 Google CSE 等を並列実行。
// 各 API キー（RAKUTEN_ACCESS_KEY / YAHOO_SHOPPING_APP_ID）が設定されてれば
// そのソースが自動で参加する。
// 既存フロントとの互換のため、本体は配列を返す（usedSources はヘッダで通知）。
//
// 性別反映：
// - クエリ ?gender=female|male があれば最優先
// - なければ getMe() で自分の性別を取って楽天ジャンル絞りに使う

import { NextResponse } from 'next/server'
import { searchProducts } from '@/lib/product-search'
import { toGenderFilter } from '@/lib/product-search/types'
import { getMe } from '@/lib/friends'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('q') || ''
  if (!keyword.trim()) return NextResponse.json([])

  // 性別フィルタ：クエリ優先 → 未指定なら自分のプロフィールから
  const qGender = searchParams.get('gender')
  let gender: ReturnType<typeof toGenderFilter> = undefined
  if (qGender === 'female' || qGender === 'male') {
    gender = qGender
  } else {
    const me = await getMe()
    gender = toGenderFilter(me?.gender)
  }

  const { items, usedSources, isDemoOnly } = await searchProducts(keyword, { gender })

  // 配列を直接返しつつ、利用ソースをヘッダで通知（フロント側で表示可能）
  return NextResponse.json(items, {
    headers: {
      'X-Search-Sources': usedSources.join(','),
      'X-Search-Demo-Only': isDemoOnly ? '1' : '0',
      'X-Search-Gender': gender || 'all',
    },
  })
}
