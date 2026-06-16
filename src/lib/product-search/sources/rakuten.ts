// 楽天市場 IchibaItem Search API ソース（新仕様 2026-04-01）
// https://webservice.rakuten.co.jp/documentation/ichiba-item-search
//
// 認証：applicationId（UUID形式）と accessKey（pk_ で始まる）の両方をクエリで渡す。
//   どちらか片方だけだと弾かれる。
//   旧エンドポイント（app.rakuten.co.jp）は廃止に近く、新エンドポイントを使う。
//
// 必要な環境変数：
//   - RAKUTEN_APPLICATION_ID : UUID形式（webservice.rakuten.co.jp/app/list で確認）
//   - RAKUTEN_ACCESS_KEY     : pk_... 形式（同管理画面、👁アイコンで表示）

import type { ProductSearchResult } from '@/types/fashion'
import type { ProductSource, SourceSearchOptions } from '../types'

const ENDPOINT =
  'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401'

// 楽天市場のファッション系ジャンル ID
// - 100371: レディースファッション
// - 551177: メンズファッション
// 親ジャンルで絞ることでカーテン・寝具・食器等が混ざるのを防ぐ。
const GENRE_FEMALE = '100371'
const GENRE_MALE = '551177'

export const rakutenSource: ProductSource = {
  id: 'rakuten',
  label: '楽天市場',
  available(): boolean {
    return !!(process.env.RAKUTEN_APPLICATION_ID && process.env.RAKUTEN_ACCESS_KEY)
  },
  async search(keyword: string, opts: SourceSearchOptions = {}): Promise<ProductSearchResult[]> {
    const { limit = 20, gender } = opts
    const applicationId = process.env.RAKUTEN_APPLICATION_ID
    const accessKey = process.env.RAKUTEN_ACCESS_KEY
    if (!applicationId || !accessKey) return []
    try {
      const params = new URLSearchParams({
        applicationId,
        accessKey,
        keyword,
        hits: String(Math.min(30, Math.max(1, limit))),
        imageFlag: '1',
        sort: '-reviewCount',
      })
      // 性別に応じてジャンルを絞る
      // - female → レディース
      // - male   → メンズ
      // - 指定なし → 絞らない（広く取る）
      if (gender === 'female') params.set('genreId', GENRE_FEMALE)
      else if (gender === 'male') params.set('genreId', GENRE_MALE)
      // アフィリエイトID（任意）：あればクリック報酬対象に
      const affiliateId = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID
      if (affiliateId) params.set('affiliateId', affiliateId)

      const res = await fetch(`${ENDPOINT}?${params}`, {
        // SSR キャッシュ無効（在庫が動く）
        cache: 'no-store',
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.warn('[rakuten] HTTP', res.status, body.slice(0, 200))
        return []
      }
      const data = await res.json()
      if (data.errors || data.error || !Array.isArray(data.Items)) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.Items.map((item: any): ProductSearchResult => ({
        name: item.Item.itemName,
        brand: item.Item.shopName,
        imageUrl: item.Item.mediumImageUrls?.[0]?.imageUrl || '',
        productUrl: item.Item.itemUrl,
        price: item.Item.itemPrice,
        itemCode: item.Item.itemCode,
        source: 'rakuten',
      }))
    } catch (e) {
      console.warn('[rakuten] error:', e)
      return []
    }
  },
}
