import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('q') || ''
  if (!keyword.trim()) return NextResponse.json([])

  const appId = process.env.RAKUTEN_APP_ID
  const params = new URLSearchParams({
    applicationId: appId || '',
    keyword,
    hits: '5',
    imageFlag: '1',
  })
  const url = `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?${params}`
  const res = await fetch(url)
  const data = await res.json()
  return NextResponse.json({ status: res.status, appId: appId?.slice(0, 8) + '...', data })
}
