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

// ─── 友人（試着対象の人物） ───
export type BodyType = 'スリム' | 'ふつう' | 'がっしり'
export type Gender = '男性' | '女性' | '指定しない'
export type Relationship = '友達' | '家族' | '恋人・パートナー' | '自分' | 'その他'
export type LoraStatus = 'none' | 'pending' | 'training' | 'ready' | 'failed'

export interface Friend {
  id: string
  user_id: string
  name: string
  height_cm?: number
  body_type?: BodyType
  gender?: Gender
  birthday?: string // YYYY-MM-DD
  relationship?: Relationship
  is_me: boolean
  thumb_url?: string
  face_photo_count: number
  lora_status: LoraStatus
  lora_url?: string
  lora_trained_at?: string
  created_at: string
}
