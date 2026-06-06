// 検索結果の重複排除 + スコアリング
// 同じ商品が複数ソースに出る or 似た商品が乱立するのを抑える。

import type { ProductSearchResult } from '@/types/fashion'

// 商品名を正規化（重複判定用）
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[【】\[\]()（）<>《》「」『』"'`、。,.!?！？・/\\|~^_+=*&%$#@:;]/g, '')
    .replace(/\s+/g, '')
    .replace(/[mlsxl0-9]/g, '') // サイズ・数値ノイズ
    .slice(0, 30)
}

// 重複排除（正規化名 + ブランド一致で同一商品とみなす）
export function dedupe(items: ProductSearchResult[]): ProductSearchResult[] {
  const seen = new Map<string, ProductSearchResult>()
  for (const item of items) {
    const key = `${normalize(item.brand || '')}__${normalize(item.name)}`
    if (key === '__') continue
    if (!seen.has(key)) {
      seen.set(key, item)
    } else {
      // 重複の場合、画像があるもの・価格が低いものを優先
      const existing = seen.get(key)!
      const score = (it: ProductSearchResult) =>
        (it.imageUrl ? 10 : 0) + (it.price ? Math.max(0, 100 - it.price / 1000) : 0)
      if (score(item) > score(existing)) {
        seen.set(key, item)
      }
    }
  }
  return Array.from(seen.values())
}

// 日本語表記 ⇔ ローマ字ブランドの双方向エイリアス
// 例: 「ユニクロ」検索で UNIQLO のブランド名にもマッチする
const BRAND_ALIAS_SETS: string[][] = [
  ['ユニクロ', 'uniqlo'],
  ['ジーユー', 'gu'],
  ['ザラ', 'zara'],
  ['エイチアンドエム', 'h&m', 'hm'],
  ['スナイデル', 'snidel'],
  ['ビームス', 'beams'],
  ['チャンピオン', 'champion'],
  ['コーチ', 'coach'],
  ['マウジー', 'moussy'],
  ['エモダ', 'emoda'],
  ['バーバリー', 'burberry'],
  ['スライ', 'sly'],
  ['リーバイス', "levi's", 'levis'],
]

function expandWord(w: string): string[] {
  const lower = w.toLowerCase()
  for (const set of BRAND_ALIAS_SETS) {
    if (set.some((a) => lower === a.toLowerCase() || lower.includes(a.toLowerCase()))) {
      return Array.from(new Set([lower, ...set.map((a) => a.toLowerCase())]))
    }
  }
  return [lower]
}

// 検索キーワードとの一致度スコア
// ブランド名の完全一致 > 名前への部分一致
export function scoreItem(item: ProductSearchResult, keyword: string): number {
  if (!keyword) return 0
  const kw = keyword.toLowerCase()
  const kwWords = kw.split(/\s+/).filter((w) => w.length > 0)
  if (kwWords.length === 0) return 0

  const nameL = (item.name || '').toLowerCase()
  const brandL = (item.brand || '').toLowerCase()

  let score = 0

  for (const w of kwWords) {
    const candidates = expandWord(w)
    for (const c of candidates) {
      if (brandL.includes(c)) {
        score += 50
        break
      }
    }
    for (const c of candidates) {
      if (nameL.includes(c)) {
        score += 20
        break
      }
    }
  }

  // 画像ありはボーナス
  if (item.imageUrl) score += 5
  // ソース別の信頼度（公式ブランド店舗が多いソースを優遇）
  if (item.source === 'yahoo') score += 3
  if (item.source === 'rakuten') score += 2
  if (item.source === 'demo') score -= 10 // デモは最下位

  return score
}

export function sortByRelevance(
  items: ProductSearchResult[],
  keyword: string
): ProductSearchResult[] {
  return [...items].sort((a, b) => scoreItem(b, keyword) - scoreItem(a, keyword))
}
