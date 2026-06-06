// マルチソース商品検索の抽象化レイヤ
// 各 EC サイトの API は形式が違うため、共通の interface に揃える。
// 新しいソース（楽天 / Yahoo / Google / SHEIN 等）を追加する時は
// この interface を実装するだけで自動的にマージ対象になる。

import { ProductSearchResult } from '@/types/fashion'

export type SourceId = 'rakuten' | 'yahoo' | 'google' | 'demo'

export interface ProductSource {
  /** ソース識別子 */
  id: SourceId
  /** UI / ログ表示用の名前 */
  label: string
  /** API キーが設定されているか */
  available(): boolean
  /** 商品検索（失敗時は空配列を返す。例外は内側で握る） */
  search(keyword: string, limit?: number): Promise<ProductSearchResult[]>
}

export interface SearchOptions {
  /** 各ソースに要求する最大件数（デフォルト20） */
  perSourceLimit?: number
  /** 最終出力の上限件数（デフォルト20） */
  totalLimit?: number
  /** 並列タイムアウト ms（デフォルト3000） */
  timeoutMs?: number
}
