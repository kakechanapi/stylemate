// Yahoo!ショッピング 商品検索 API V3 ソース
// https://developer.yahoo.co.jp/webapi/shopping/v3/itemsearch.html
//
// 楽天との違い：
// - UNIQLO 公式ストアが Yahoo!ショッピングに出店している（楽天には無い）
// - APIキーは Yahoo! Developer Network で即時発行（Gmail で取れる）

import type { ProductSearchResult } from '@/types/fashion'
import type { ProductSource } from '../types'

const ENDPOINT = 'https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch'

export const yahooSource: ProductSource = {
  id: 'yahoo',
  label: 'Yahoo!ショッピング',
  available(): boolean {
    return !!process.env.YAHOO_SHOPPING_APP_ID
  },
  async search(keyword: string, limit = 20): Promise<ProductSearchResult[]> {
    const appId = process.env.YAHOO_SHOPPING_APP_ID
    if (!appId) return []
    try {
      const params = new URLSearchParams({
        appid: appId,
        query: keyword,
        results: String(Math.min(50, Math.max(1, limit))),
        in_stock: 'true',
        image_size: '300',
        // ファッションカテゴリに絞る（13457 = ファッション）
        // 絞り過ぎリスクも考慮、必要に応じて外せる
        genre_category_id: '13457',
        sort: '-review_count',
      })
      const res = await fetch(`${ENDPOINT}?${params}`, { cache: 'no-store' })
      if (!res.ok) {
        console.warn('[yahoo] HTTP', res.status)
        return []
      }
      const data = await res.json()
      if (!Array.isArray(data.hits)) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.hits.map((it: any): ProductSearchResult => ({
        name: it.name || '',
        // brand_name は公式ブランド店舗名、seller.name はショップ名（フォールバック）
        brand: it.brand?.name || it.seller?.name || '',
        imageUrl: it.image?.medium || it.image?.small || '',
        productUrl: it.url || '',
        price: typeof it.price === 'number' ? it.price : Number(it.price) || 0,
        itemCode: it.code || it.janCode || '',
        source: 'yahoo',
      }))
    } catch (e) {
      console.warn('[yahoo] error:', e)
      return []
    }
  },
}
