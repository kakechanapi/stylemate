// 管理者専用：サンプルクローゼットを 50 着投入する API
//
// 用途：
// - 開発・検証時に「クローゼットが空でAI提案が貧弱」を解消
// - 楽天 API から実物の商品画像つきでバランスよく投入
// - Gemini Vision との相性も◎
//
// 投入される構成（性別による）：
// - トップス     15
// - ボトムス     10
// - ワンピース    8（女性のみ。男性は他カテゴリに振り分け）
// - 羽織り       8
// - 靴            5
// - バッグ        4
// 合計 50（女性）/ 42 + 男性追加分（男性）
//
// 既存サンプル（name に [SAMPLE] プレフィックス）があれば事前削除して
// 重複投入を防ぐ。

import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin'
import { searchProducts } from '@/lib/product-search'
import { toGenderFilter } from '@/lib/product-search/types'
import { getMe } from '@/lib/friends'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { classifyClothing } from '@/lib/clothes-classifier'
import type { Category } from '@/types/fashion'

// 識別用プレフィックス。再投入時の重複削除や、ユーザー追加分との区別に使う
const SAMPLE_PREFIX = '[SAMPLE] '

interface SeedBucket {
  category: Category
  keywords: string[]
  targetCount: number
}

function buildBuckets(gender: 'female' | 'male' | undefined): SeedBucket[] {
  const isFemale = gender === 'female'
  const isMale = gender === 'male'

  if (isFemale) {
    return [
      { category: 'tops', keywords: ['ニット', 'ブラウス', 'シャツ', 'カットソー', 'カーディガン', 'Tシャツ'], targetCount: 15 },
      { category: 'bottoms', keywords: ['デニム', 'スカート', 'プリーツスカート', 'ワイドパンツ', 'スラックス'], targetCount: 10 },
      { category: 'dress', keywords: ['ワンピース', 'シャツワンピース', 'ロングワンピース'], targetCount: 8 },
      { category: 'outerwear', keywords: ['ジャケット', 'コート', 'カーディガン', 'ブルゾン', 'トレンチコート'], targetCount: 8 },
      { category: 'shoes', keywords: ['スニーカー', 'パンプス', 'ローファー', 'ブーツ'], targetCount: 5 },
      { category: 'bag', keywords: ['トートバッグ', 'ショルダーバッグ', 'ハンドバッグ'], targetCount: 4 },
    ]
  }
  if (isMale) {
    return [
      { category: 'tops', keywords: ['Tシャツ', 'シャツ', 'ニット', 'ポロシャツ', 'カットソー', 'スウェット'], targetCount: 15 },
      { category: 'bottoms', keywords: ['デニム', 'チノパン', 'スラックス', 'ワイドパンツ', 'ジョガーパンツ'], targetCount: 10 },
      { category: 'outerwear', keywords: ['ジャケット', 'コート', 'パーカー', 'ブルゾン', 'マウンテンパーカー', 'カーディガン'], targetCount: 12 },
      { category: 'shoes', keywords: ['スニーカー', 'ローファー', 'ブーツ'], targetCount: 5 },
      { category: 'bag', keywords: ['リュック', 'トートバッグ', 'ショルダーバッグ'], targetCount: 4 },
      // dress は男性想定外なのでスキップ
    ]
  }
  // 性別未設定：中性ぽくバランス
  return [
    { category: 'tops', keywords: ['ニット', 'シャツ', 'Tシャツ', 'カットソー'], targetCount: 14 },
    { category: 'bottoms', keywords: ['デニム', 'スラックス', 'スカート', 'ワイドパンツ'], targetCount: 10 },
    { category: 'dress', keywords: ['ワンピース'], targetCount: 4 },
    { category: 'outerwear', keywords: ['ジャケット', 'コート', 'カーディガン'], targetCount: 10 },
    { category: 'shoes', keywords: ['スニーカー', 'ローファー', 'ブーツ'], targetCount: 5 },
    { category: 'bag', keywords: ['トートバッグ', 'リュック'], targetCount: 4 },
  ]
}

export async function POST() {
  // 管理者チェック
  const admin = await checkAdmin()
  if (!admin.isAdmin) {
    return NextResponse.json(
      { ok: false, error: '管理者のみ実行できます' },
      { status: 403 }
    )
  }

  const supabase = await createSupabaseServerClient()
  const me = await getMe()
  const gender = toGenderFilter(me?.gender)

  // 既存のサンプルを削除（重複投入防止）
  if (admin.userId) {
    await supabase
      .from('clothes')
      .delete()
      .eq('user_id', admin.userId)
      .like('name', `${SAMPLE_PREFIX}%`)
  }

  const buckets = buildBuckets(gender)
  let totalAdded = 0
  const errors: string[] = []

  for (const bucket of buckets) {
    let bucketAdded = 0
    // キーワードをシャッフルして取る順序をランダム化
    const shuffled = [...bucket.keywords].sort(() => Math.random() - 0.5)
    for (const kw of shuffled) {
      if (bucketAdded >= bucket.targetCount) break
      try {
        const remaining = bucket.targetCount - bucketAdded
        const need = Math.min(remaining, 5) // 1キーワードから取りすぎない
        const { items } = await searchProducts(kw, {
          gender,
          perSourceLimit: need + 3,
          totalLimit: need + 3,
        })
        // 画像があるものだけ
        const usable = items.filter((it) => it.imageUrl).slice(0, need)
        for (const item of usable) {
          // classifyClothing で自動分類しつつ、bucket.category を優先
          const cls = classifyClothing({ name: item.name, brand: item.brand })
          const insertRow = {
            user_id: admin.userId,
            // [SAMPLE] プレフィックスで識別。削除しやすい
            name: `${SAMPLE_PREFIX}${item.name.slice(0, 60)}`,
            brand: item.brand || undefined,
            // bucket のカテゴリ優先（検索時にカテゴリ別キーワードで取ったので）
            category: bucket.category,
            color: cls.color || undefined,
            image_url: item.imageUrl,
            product_url: item.productUrl,
            tpo_tags: cls.tpoTags.length > 0 ? cls.tpoTags : ['casual'],
            season_tags: cls.seasonTags,
          }
          const { error } = await supabase.from('clothes').insert(insertRow)
          if (!error) {
            bucketAdded++
            totalAdded++
          } else {
            errors.push(`${kw}: ${error.message}`)
          }
        }
      } catch (e) {
        errors.push(`${kw}: ${e instanceof Error ? e.message : 'unknown'}`)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    totalAdded,
    gender: gender || 'unspecified',
    buckets: buckets.map((b) => ({ category: b.category, target: b.targetCount })),
    errors: errors.slice(0, 5), // デバッグ用に最初の5つだけ返す
  })
}

// 既存サンプルだけ削除する DELETE エンドポイント
export async function DELETE() {
  const admin = await checkAdmin()
  if (!admin.isAdmin) {
    return NextResponse.json(
      { ok: false, error: '管理者のみ実行できます' },
      { status: 403 }
    )
  }
  const supabase = await createSupabaseServerClient()
  if (!admin.userId) {
    return NextResponse.json({ ok: false, error: 'ユーザー特定できず' }, { status: 400 })
  }
  const { error, count } = await supabase
    .from('clothes')
    .delete({ count: 'exact' })
    .eq('user_id', admin.userId)
    .like('name', `${SAMPLE_PREFIX}%`)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, deleted: count || 0 })
}
