export interface RakutenProduct {
  name: string
  brand: string
  imageUrl: string
  productUrl: string
  price: number
  itemCode: string
}

export async function searchRakutenFashion(keyword: string): Promise<RakutenProduct[]> {
  const appId = process.env.RAKUTEN_APP_ID
  if (!appId) return []
  try {
    const params = new URLSearchParams({
      applicationId: appId,
      keyword,
      genreId: '100371', // ファッションジャンル
      hits: '10',
      imageFlag: '1',
      sort: '-reviewCount',
    })
    const res = await fetch(`https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.Items || []).map((item: any) => ({
      name: item.Item.itemName,
      brand: item.Item.shopName,
      imageUrl: item.Item.mediumImageUrls?.[0]?.imageUrl || '',
      productUrl: item.Item.itemUrl,
      price: item.Item.itemPrice,
      itemCode: item.Item.itemCode,
    }))
  } catch {
    return []
  }
}
