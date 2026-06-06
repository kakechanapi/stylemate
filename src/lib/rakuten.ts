// 【非推奨】このファイルは後方互換のためのリダイレクト
// 新規コードは src/lib/product-search/ を直接使うこと。
//
// 旧来 lib/rakuten.ts から import していた箇所が動き続けるよう、
// 同名のエクスポートをマルチソース版に置換している。

import type { ProductSearchResult } from '@/types/fashion'
export type RakutenProduct = ProductSearchResult

import { searchRakutenFashion as _search } from './product-search'

export async function searchRakutenFashion(keyword: string): Promise<ProductSearchResult[]> {
  return _search(keyword)
}
