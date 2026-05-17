import { NextResponse } from 'next/server'
import { generateOutfitSuggestion } from '@/lib/claude'

export async function POST(request: Request) {
  const { clothes, weather, tpo } = await request.json()
  const result = await generateOutfitSuggestion(clothes || [], weather, tpo || 'casual')
  return NextResponse.json(result)
}
