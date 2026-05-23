import { NextResponse } from 'next/server'
import { generateOutfitSuggestion } from '@/lib/gemini'

export async function POST(request: Request) {
  const body = await request.json()
  const result = await generateOutfitSuggestion(body.clothes || [], {
    weather: body.weather || null,
    tpo: body.tpo || 'casual',
    scheduleTitle: body.scheduleTitle,
    styleTags: body.styleTags,
    recentClothIds: body.recentClothIds,
  })
  return NextResponse.json(result)
}
