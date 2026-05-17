export type Category = 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'bag' | 'accessory' | 'dress' | 'other'

export type TPO = 'casual' | 'date' | 'work' | 'party' | 'sport' | 'formal'

export interface ClothingItem {
  id: string
  user_id: string
  name: string
  brand?: string
  category: Category
  color?: string
  image_url?: string
  product_url?: string
  barcode?: string
  tpo_tags: string[]
  season_tags: string[]
  wear_count: number
  last_worn_at?: string
  created_at: string
}

export interface Outfit {
  id: string
  user_id: string
  name?: string
  cloth_ids: string[]
  tpo?: string
  worn_at: string
  weather?: string
  temperature?: number
  note?: string
  created_at: string
}

export interface WeatherData {
  temperature: number
  description: string
  icon: string
  humidity: number
  city: string
}

export interface ProductSearchResult {
  name: string
  brand: string
  imageUrl: string
  productUrl: string
  price?: number
  itemCode?: string
}
