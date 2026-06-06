// API キー未設定時のフォールバック。
// 「真っ白で何も出ない」を避けるため、キーワードに緩く一致するモック商品を返す。
// 本番では実 API ソースが available になるとこちらはスキップされる。

import type { ProductSearchResult } from '@/types/fashion'
import type { ProductSource } from '../types'

interface DemoItem {
  name: string
  brand: string
  url: string
  category: string // 'tops' / 'bottoms' / 'outerwear' / 'shoes' / 'bag' / 'dress' / 'accessory'
  colors: string[]
}

// Unsplash の無料ファッション画像で構成
const DEMO_ITEMS: DemoItem[] = [
  { name: 'ホワイトTシャツ', brand: 'UNIQLO', url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=600&fit=crop', category: 'tops', colors: ['ホワイト'] },
  { name: 'スキニーデニム', brand: 'GU', url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=600&fit=crop', category: 'bottoms', colors: ['ブルー', 'ネイビー'] },
  { name: 'ニットセーター', brand: 'ZARA', url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=600&fit=crop', category: 'tops', colors: ['ベージュ'] },
  { name: 'フローラルワンピース', brand: 'H&M', url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&h=600&fit=crop', category: 'dress', colors: ['ピンク'] },
  { name: 'カーディガン', brand: 'UNIQLO', url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=600&fit=crop', category: 'tops', colors: ['ベージュ'] },
  { name: 'プリーツスカート', brand: 'snidel', url: 'https://images.unsplash.com/photo-1583496661160-fb5886a13d44?w=400&h=600&fit=crop', category: 'bottoms', colors: ['ピンク'] },
  { name: 'デニムジャケット', brand: "Levi's", url: 'https://images.unsplash.com/photo-1543087903-1ac2ec7aa8c5?w=400&h=600&fit=crop', category: 'outerwear', colors: ['ブルー'] },
  { name: 'ブラウス', brand: 'GU', url: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400&h=600&fit=crop', category: 'tops', colors: ['ホワイト'] },
  { name: 'チェックシャツ', brand: 'BEAMS', url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=600&fit=crop', category: 'tops', colors: ['レッド'] },
  { name: 'コーデュロイパンツ', brand: 'UNIQLO', url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=600&fit=crop', category: 'bottoms', colors: ['ブラウン'] },
  { name: 'トレンチコート', brand: 'BURBERRY', url: 'https://images.unsplash.com/photo-1591047139756-eb1b3a3b1a0f?w=400&h=600&fit=crop', category: 'outerwear', colors: ['ベージュ'] },
  { name: 'ボーダーカットソー', brand: 'SLY', url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&h=600&fit=crop', category: 'tops', colors: ['ホワイト', 'ネイビー'] },
  { name: 'パーカー', brand: 'CHAMPION', url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=600&fit=crop', category: 'tops', colors: ['グレー'] },
  { name: 'ロングコート', brand: 'COACH', url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&h=600&fit=crop', category: 'outerwear', colors: ['ブラック'] },
  { name: 'ミニドレス', brand: 'MOUSSY', url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=600&fit=crop', category: 'dress', colors: ['ブラック'] },
  { name: 'シフォンブラウス', brand: 'EMODA', url: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400&h=600&fit=crop', category: 'tops', colors: ['ホワイト'] },
]

// よく検索される日本語表記 → 内部のローマ字ブランド名へのエイリアス
// （demo データはローマ字ブランド名なので、ユーザーがカタカナで入れても拾えるように）
const BRAND_ALIASES: Record<string, string[]> = {
  uniqlo: ['ユニクロ', 'uniqlo'],
  gu: ['ジーユー', 'gu'],
  zara: ['ザラ', 'zara'],
  'h&m': ['エイチアンドエム', 'h&m', 'hm'],
  snidel: ['スナイデル', 'snidel'],
  beams: ['ビームス', 'beams'],
  champion: ['チャンピオン', 'champion'],
  coach: ['コーチ', 'coach'],
  moussy: ['マウジー', 'moussy'],
  emoda: ['エモダ', 'emoda'],
  burberry: ['バーバリー', 'burberry'],
  sly: ['スライ', 'sly'],
  "levi's": ['リーバイス', "levi's", 'levis'],
}

// カテゴリ・アイテム種別のエイリアス
// 「ジーンズ」で検索 → 「デニム」を含む商品もヒットさせる等
const KEYWORD_ALIASES: string[][] = [
  ['ジーンズ', 'デニム', 'jeans', 'denim'],
  ['パンツ', 'ズボン', 'スラックス', 'pants'],
  ['シャツ', 'ブラウス', 'shirt'],
  ['Tシャツ', 'tシャツ', 'カットソー', 'tee'],
  ['スカート', 'skirt', 'プリーツ'],
  ['ワンピース', 'ワンピ', 'ドレス', 'dress'],
  ['ジャケット', 'コート', 'アウター', 'outerwear'],
  ['ニット', 'セーター', 'カーディガン', 'knit', 'sweater'],
  ['パーカー', 'スウェット', 'hoodie'],
  ['シューズ', 'スニーカー', 'ブーツ', 'shoes'],
  ['バッグ', 'リュック', 'トート', 'bag'],
]

function expandKeyword(kw: string): string[] {
  const lower = kw.toLowerCase()
  const expanded = new Set<string>([lower])
  for (const aliases of Object.values(BRAND_ALIASES)) {
    if (aliases.some((a) => lower.includes(a.toLowerCase()))) {
      aliases.forEach((a) => expanded.add(a.toLowerCase()))
    }
  }
  for (const set of KEYWORD_ALIASES) {
    if (set.some((a) => lower.includes(a.toLowerCase()))) {
      set.forEach((a) => expanded.add(a.toLowerCase()))
    }
  }
  return Array.from(expanded)
}

function matches(item: DemoItem, kw: string): boolean {
  const haystack = `${item.name} ${item.brand} ${item.category} ${item.colors.join(' ')}`.toLowerCase()
  return kw
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .every((w) => {
      // 元の単語 or そのエイリアスのいずれかが含まれれば OK
      const candidates = expandKeyword(w)
      return candidates.some((c) => haystack.includes(c))
    })
}

export const demoSource: ProductSource = {
  id: 'demo',
  label: 'デモ商品',
  available(): boolean {
    // 本番では絶対に出さない。
    // - localhost（NODE_ENV !== 'production'）でのみ動作
    // - 明示的に ENABLE_DEMO_SEARCH=true をセットした場合のみ本番でも動作
    // これにより「実APIキー未取得のまま本番リリース」しても
    // 偽物商品がユーザーに表示される事故を防ぐ。
    if (process.env.NODE_ENV !== 'production') return true
    return process.env.ENABLE_DEMO_SEARCH === 'true'
  },
  async search(keyword: string, limit = 10): Promise<ProductSearchResult[]> {
    const kw = keyword.trim()
    // キーワードに一致するもの優先 → 足りなければシャッフル補完
    const matched = kw ? DEMO_ITEMS.filter((it) => matches(it, kw)) : []
    const rest = DEMO_ITEMS.filter((it) => !matched.includes(it))
    const shuffled = [...rest].sort(() => Math.random() - 0.5)
    const merged = [...matched, ...shuffled].slice(0, limit)
    return merged.map((d, i): ProductSearchResult => ({
      name: d.name,
      brand: d.brand,
      imageUrl: d.url,
      productUrl: '#',
      price: 1500 + i * 500,
      itemCode: `demo-${kw}-${i}-${d.name}`,
      source: 'demo',
    }))
  },
}
