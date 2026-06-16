// マルチソース商品検索の抽象化レイヤ
// 各 EC サイトの API は形式が違うため、共通の interface に揃える。
// 新しいソース（楽天 / Yahoo / Google / SHEIN 等）を追加する時は
// この interface を実装するだけで自動的にマージ対象になる。

import { ProductSearchResult } from '@/types/fashion'

export type SourceId = 'rakuten' | 'yahoo' | 'google' | 'demo'

/** 性別フィルタ。'female' | 'male' | undefined（指定なし=全部） */
export type GenderFilter = 'female' | 'male' | undefined

/**
 * 日本語の性別表記（friends.gender が '男性' | '女性' | '指定しない'）を
 * product-search の GenderFilter に変換するヘルパー
 */
export function toGenderFilter(gender: string | null | undefined): GenderFilter {
  if (gender === '女性') return 'female'
  if (gender === '男性') return 'male'
  return undefined
}

/** ソース毎に渡す追加オプション */
export interface SourceSearchOptions {
  limit?: number
  gender?: GenderFilter
}

export interface ProductSource {
  /** ソース識別子 */
  id: SourceId
  /** UI / ログ表示用の名前 */
  label: string
  /** API キーが設定されているか */
  available(): boolean
  /** 商品検索（失敗時は空配列を返す。例外は内側で握る） */
  search(keyword: string, opts?: SourceSearchOptions): Promise<ProductSearchResult[]>
}

export interface SearchOptions {
  /** 各ソースに要求する最大件数（デフォルト20） */
  perSourceLimit?: number
  /** 最終出力の上限件数（デフォルト20） */
  totalLimit?: number
  /** 並列タイムアウト ms（デフォルト3000） */
  timeoutMs?: number
  /** 性別フィルタ（楽天ジャンル ID に反映、ノイズ除去の精度UP） */
  gender?: GenderFilter
}
