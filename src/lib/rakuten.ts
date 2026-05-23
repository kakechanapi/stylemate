export interface RakutenProduct {
  name: string
  brand: string
  imageUrl: string
  productUrl: string
  price: number
  itemCode: string
}

export async function searchRakutenFashion(keyword: string): Promise<RakutenProduct[]> {
  const accessKey = process.env.RAKUTEN_ACCESS_KEY
  if (!accessKey) return getDemoResults(keyword)
  try {
    const params = new URLSearchParams({
      keyword,
      hits: '10',
      imageFlag: '1',
      sort: '-reviewCount',
    })
    const res = await fetch(
      `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?${params}`,
      { headers: { Authorization: `ESA ${accessKey}` } }
    )
    const data = await res.json()
    if (data.error || !data.Items?.length) return getDemoResults(keyword)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.Items.map((item: any) => ({
      name: item.Item.itemName,
      brand: item.Item.shopName,
      imageUrl: item.Item.mediumImageUrls?.[0]?.imageUrl || '',
      productUrl: item.Item.itemUrl,
      price: item.Item.itemPrice,
      itemCode: item.Item.itemCode,
    }))
  } catch {
    return getDemoResults(keyword)
  }
}

// Rakuten API キー未設定時のフォールバック。
// Unsplash の無料ファッション画像を使う（テスト・デモ用）。
// 本番では NEXT 楽天 Application ID を取得して実商品検索に切り替える。
const DEMO_IMAGES = [
  { name: 'ホワイトTシャツ', brand: 'UNIQLO',  url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=600&fit=crop' },
  { name: 'スキニーデニム',  brand: 'GU',      url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=600&fit=crop' },
  { name: 'ニットセーター',  brand: 'ZARA',    url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=600&fit=crop' },
  { name: 'フローラルワンピ', brand: 'H&M',     url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&h=600&fit=crop' },
  { name: 'カーディガン',    brand: 'UNIQLO',  url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=600&fit=crop' },
  { name: 'プリーツスカート', brand: 'snidel',  url: 'https://images.unsplash.com/photo-1583496661160-fb5886a13d44?w=400&h=600&fit=crop' },
  { name: 'デニムジャケット', brand: 'Levi\'s', url: 'https://images.unsplash.com/photo-1543087903-1ac2ec7aa8c5?w=400&h=600&fit=crop' },
  { name: 'ブラウス',        brand: 'GU',      url: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400&h=600&fit=crop' },
  { name: 'チェックシャツ',   brand: 'BEAMS',   url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=600&fit=crop' },
  { name: 'コーディロイパンツ', brand: 'UNIQLO',url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=600&fit=crop' },
  { name: 'トレンチコート',   brand: 'BURBERRY',url: 'https://images.unsplash.com/photo-1591047139756-eb1b3a3b1a0f?w=400&h=600&fit=crop' },
  { name: 'ボーダーカットソー', brand: 'SLY',  url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&h=600&fit=crop' },
  { name: 'パーカー',        brand: 'CHAMPION',url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=600&fit=crop' },
  { name: 'ロングコート',    brand: 'COACH',   url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&h=600&fit=crop' },
  { name: 'ミニドレス',      brand: 'MOUSSY',  url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=600&fit=crop' },
  { name: 'シフォンブラウス', brand: 'EMODA', url: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400&h=600&fit=crop' },
]

function getDemoResults(keyword: string): RakutenProduct[] {
  // キーワードと無関係に全 demo 画像を返す（スワイプ用に多めに）
  // shuffle して 8件返す
  const shuffled = [...DEMO_IMAGES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 8).map((d, i) => ({
    name: `${d.name}（${keyword}向け）`,
    brand: d.brand,
    imageUrl: d.url,
    productUrl: '#',
    price: 1500 + i * 500,
    itemCode: `demo-${d.name}-${i}`,
  }))
}
