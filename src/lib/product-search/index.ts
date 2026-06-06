// 商品検索の司令塔
// 利用可能な全ソースを並列で叩き、重複排除 → ソート → 上位N件を返す。
//
// 設計のうれしさ：
// - 新ソース追加は sources/ に1ファイル足して SOURCES に登録するだけ
// - APIキー未設定のソースは自動でスキップ
// - 1ソースが落ちても他の結果は届く
// - 将来 Vercel KV キャッシュを挟むのも index.ts に集約できる

import type { ProductSearchResult } from '@/types/fashion'
import type { ProductSource, SearchOptions } from './types'
import { rakutenSource } from './sources/rakuten'
import { yahooSource } from './sources/yahoo'
import { demoSource } from './sources/demo'
import { dedupe, sortByRelevance } from './rank'

// 登録されているソース（追加するときはここに足す）
const SOURCES: ProductSource[] = [yahooSource, rakutenSource, demoSource]

export interface SearchResponse {
  items: ProductSearchResult[]
  usedSources: string[] // 実際にデータを返したソース
  isDemoOnly: boolean // demo のみ動作中（=本物のAPIが未連携）であることを示す
}

export async function searchProducts(
  keyword: string,
  opts: SearchOptions = {}
): Promise<SearchResponse> {
  const kw = (keyword || '').trim()
  if (!kw) return { items: [], usedSources: [], isDemoOnly: false }

  const perSourceLimit = opts.perSourceLimit ?? 20
  const totalLimit = opts.totalLimit ?? 20
  const timeoutMs = opts.timeoutMs ?? 3000

  const liveSources = SOURCES.filter((s) => s.available())

  // 各ソースをタイムアウト付き並列実行
  const promises = liveSources.map((s) =>
    Promise.race([
      s.search(kw, perSourceLimit).then((items) => ({ id: s.id, items })),
      new Promise<{ id: string; items: ProductSearchResult[] }>((resolve) =>
        setTimeout(() => resolve({ id: s.id, items: [] }), timeoutMs)
      ),
    ])
  )

  const results = await Promise.allSettled(promises)

  // 集約
  const merged: ProductSearchResult[] = []
  const usedSources: string[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') {
      if (r.value.items.length > 0) {
        merged.push(...r.value.items)
        usedSources.push(r.value.id)
      }
    }
  }

  // 実 API ソースが1件でも返したなら、demo は出さない方針
  // （demo は available()=true なので必ず混ざるため明示的に除く）
  const hasRealResults = usedSources.some((id) => id !== 'demo')
  const filtered = hasRealResults ? merged.filter((it) => it.source !== 'demo') : merged

  // 重複排除 → スコア順 → 上位 N
  const deduped = dedupe(filtered)
  const sorted = sortByRelevance(deduped, kw)
  const finalSources = hasRealResults ? usedSources.filter((id) => id !== 'demo') : usedSources
  return {
    items: sorted.slice(0, totalLimit),
    usedSources: finalSources,
    isDemoOnly: finalSources.length === 1 && finalSources[0] === 'demo',
  }
}

// 旧 lib/rakuten.ts との後方互換のためのラッパー
// 既存呼び出し（lib/rakuten.ts:searchRakutenFashion）が動くまま新基盤に乗せる
export async function searchRakutenFashion(keyword: string): Promise<ProductSearchResult[]> {
  const { items } = await searchProducts(keyword)
  return items
}
