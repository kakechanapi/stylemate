export async function fetchWeather(city = 'Tokyo'): Promise<{
  temperature: number
  description: string
  icon: string
  humidity: number
  city: string
} | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=ja`,
      { next: { revalidate: 1800 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return {
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      city: data.name,
    }
  } catch {
    return null
  }
}
