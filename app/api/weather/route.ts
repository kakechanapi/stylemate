import { NextRequest, NextResponse } from 'next/server'
import { fetchWeather } from '@/lib/weather'

export async function GET(request: NextRequest) {
  const latParam = request.nextUrl.searchParams.get('lat')
  const lonParam = request.nextUrl.searchParams.get('lon')

  const lat = latParam ? parseFloat(latParam) : undefined
  const lon = lonParam ? parseFloat(lonParam) : undefined

  const weather =
    lat !== undefined && lon !== undefined
      ? await fetchWeather(lat, lon)
      : await fetchWeather() // 東京デフォルト

  return NextResponse.json(weather || { error: 'Weather unavailable' })
}
