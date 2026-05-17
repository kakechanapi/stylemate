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

function getDemoResults(keyword: string): RakutenProduct[] {
  const demos = [
    { name: `${keyword} - ホワイトTシャツ`, brand: 'UNIQLO', imageUrl: '', productUrl: '#', price: 1500, itemCode: 'demo1' },
    { name: `${keyword} - スキニーデニム`, brand: 'GU', imageUrl: '', productUrl: '#', price: 2990, itemCode: 'demo2' },
    { name: `${keyword} - フリースジャケット`, brand: 'UNIQLO', imageUrl: '', productUrl: '#', price: 3990, itemCode: 'demo3' },
    { name: `${keyword} - ワンピース`, brand: 'Zara', imageUrl: '', productUrl: '#', price: 5990, itemCode: 'demo4' },
  ]
  return demos
}
