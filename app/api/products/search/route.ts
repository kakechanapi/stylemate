import { NextResponse } from 'next/server'
import { searchRakutenFashion } from '@/lib/rakuten'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('q') || ''
  if (!keyword.trim()) return NextResponse.json([])
  const results = await searchRakutenFashion(keyword)
  return NextResponse.json(results)
}
