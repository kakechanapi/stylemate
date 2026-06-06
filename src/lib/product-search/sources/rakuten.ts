// 楽天市場 IchibaItem Search API ソース
// https://webservice.rakuten.co.jp/documentation/ichiba-item-search

import type { ProductSearchResult } from '@/types/fashion'
import type { ProductSource } from '../types'

export const rakutenSource: ProductSource = {
  id: 'rakuten',
  label: '楽天市場',
  available(): boolean {
    return !!process.env.RAKUTEN_ACCESS_KEY
  },
  async search(keyword: string, limit = 20): Promise<ProductSearchResult[]> {
    const accessKey = process.env.RAKUTEN_ACCESS_KEY
    if (!accessKey) return []
    try {
      const params = new URLSearchParams({
        keyword,
        hits: String(Math.min(30, Math.max(1, limit))),
        imageFlag: '1',
        sort: '-reviewCount',
        // ファッション系ジャンル: 100371 (レディース) / 551177 (メンズ)
        // 絞ると外れるリスクもあるので、ここではあえて指定しない
      })
      const res = await fetch(
        `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?${params}`,
        {
          headers: { Authorization: `ESA ${accessKey}` },
          // SSR キャッシュ無効（在庫が動く）
          cache: 'no-store',
        }
      )
      if (!res.ok) {
        console.warn('[rakuten] HTTP', res.status)
        return []
      }
      const data = await res.json()
      if (data.error || !Array.isArray(data.Items)) return []

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
