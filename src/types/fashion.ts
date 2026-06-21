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
  // ─── 詳細特徴（migration 0009 で追加。AI コーデ提案の精度UP用） ───
  /** 素材：リネン / コットン / ウール / ナイロン / シルク / カシミヤ / デニム 等 */
  material?: string
  /** シルエット：タイト / レギュラー / ルーズ / オーバーサイズ / Aライン / フレア 等 */
  silhouette?: string
  /** 柄：無地 / ボーダー / ストライプ / チェック / 花柄 / ドット / アニマル 等 */
  pattern?: string
  /** 首元（トップス・ワンピース）：クルー / Vネック / タートル / オフショル / ボートネック 等 */
  neckline?: string
  /** 袖：半袖 / 長袖 / 七分袖 / ノースリーブ / パフ / フレア 等 */
  sleeve_type?: string
  /** 丈感：ショート / ミドル / ロング / マキシ / ミニ / ミディ 等 */
  length_type?: string
  /** 透け感：none / slight / significant */
  transparency?: 'none' | 'slight' | 'significant'
  /** その他の自由特徴ラベル（例：['フリル', 'リブ編み', '裏起毛']） */
  features?: string[]
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
  met_with_friend_ids?: string[]
  created_at: string
}

export interface WeatherData {
  temperature: number
  description: string
  icon: string
  humidity: number
  city: string
  apparentTemperature?: number // 体感温度（風＋湿度を反映）
  windSpeed?: number // 風速 (m/s)
  clothingIndex?: ClothingIndex
}

/**
 * 服装指数（tenki.jp / ウェザーニュース風）
 * - score: 0-100（高いほど薄着でOK）
 * - level: 1=極寒 ～ 5=猛暑
 * - label: 「肌寒い」等のひと言
 * - recommendation: 「長袖シャツが心地よい」等の具体的提案
 */
export interface ClothingIndex {
  score: number
  level: 1 | 2 | 3 | 4 | 5
  label: string
  recommendation: string
  emoji: string
}

export interface ProductSearchResult {
  name: string
  brand: string
  imageUrl: string
  productUrl: string
  price?: number
  itemCode?: string
  // どのソースから来たか（マルチソース時の表示や信頼度判定用）
  source?: 'rakuten' | 'yahoo' | 'google' | 'demo'
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
  lora_training_id?: string // 訓練中の Replicate training id
  lora_trained_at?: string
  note?: string // 自由記述メモ
  created_at: string
}
