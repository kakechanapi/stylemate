// 商品名による「服じゃない」ノイズ除去フィルタ。
// 楽天はジャンル ID で絞っていても、ファッション店舗が
// アクセサリー以外の生活雑貨も並べているケースがあるため、
// 商品名に明らかな非衣類キーワードがあれば落とす。
//
// 設計：
// - false ポジティブを避けるため、衣類で使う単語と紛らわしいものは入れない
//   （例：「コットン」は綿シャツに使うので NG）
// - 単語境界（前後が空白・記号）は気にせず includes で十分（日本語は分かち書きしない前提）

import type { ProductSearchResult } from '@/types/fashion'

// 服じゃない可能性が高い単語
// → 商品名・ブランド名に含まれていたら除外
const NON_CLOTHING_KEYWORDS = [
  // 寝具・カバー類
  'カーテン', '寝具', 'シーツ', '布団', '毛布', 'まくら', '枕',
  // インテリア・床
  'カーペット', 'ラグマット', '玄関マット', 'バスマット',
  '家具', 'ソファ', '椅子', 'チェア', 'デスク', '机', '棚', 'ラック',
  // キッチン・食卓
  '食器', 'タンブラー', 'グラス', 'マグカップ', 'お皿', '茶碗', '弁当箱',
  // 食品
  '食品', 'お菓子', 'ジュース', 'コーヒー豆', 'お茶',
  // 紙物・雑貨
  '文具', 'ノート', '鉛筆', 'ボールペン',
  'ぬいぐるみ', 'おもちゃ', 'プラモデル', 'フィギュア',
  // タオル類（ハンカチは衣類小物寄りなので外す）
  'バスタオル', 'フェイスタオル', 'ハンドタオル', 'タオルケット',
  // 床材・カーテン関連の付属品
  'カーテンレール', 'ブラインド',
  // メディア
  'ゲームソフト', 'コミック', '書籍', 'CD', 'DVD', 'ブルーレイ',
]

/** 商品名 + ブランドが「服じゃない」かどうか */
export function looksNonClothing(item: ProductSearchResult): boolean {
  const haystack = `${item.name || ''} ${item.brand || ''}`
  for (const kw of NON_CLOTHING_KEYWORDS) {
    if (haystack.includes(kw)) return true
  }
  return false
}

/** 商品一覧から服じゃないノイズを除去 */
export function filterClothingOnly(items: ProductSearchResult[]): ProductSearchResult[] {
  return items.filter((it) => !looksNonClothing(it))
}
