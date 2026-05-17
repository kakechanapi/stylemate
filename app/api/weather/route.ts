import { NextResponse } from 'next/server'
import { fetchWeather } from '@/lib/weather'

export async function GET() {
  const weather = await fetchWeather('Tokyo')
  return NextResponse.json(weather || { error: 'Weather unavailable' })
}
