'use server'

// OutfitSuggestionCard 用のサーバーアクション
// - 固定/却下 → 嗜好スワイプに記録
// - 今日のコーデに決定 → outfits テーブルに保存
// - リセット → 今日の outfit を削除して再提案フローへ戻す

import { recordSwipe } from '@/lib/style'
import { createOutfit, deleteOutfit } from '@/lib/outfits'
import { revalidatePath } from 'next/cache'

export async function recordOutfitSwipeAction(input: {
  image_url: string
  item_name?: string
  brand?: string
  liked: boolean
}) {
  return recordSwipe({
    image_url: input.image_url,
    item_name: input.item_name,
    brand: input.brand,
    liked: input.liked,
    source: input.liked ? 'outfit_fix' : 'outfit_reject',
  })
}

export async function confirmTodayOutfitAction(input: {
  cloth_ids: string[]
  tpo?: string
  weather?: string
  temperature?: number
  name?: string
}) {
  const today = new Date().toISOString().slice(0, 10)
  const result = await createOutfit({
    name: input.name || '今日のコーデ',
    cloth_ids: input.cloth_ids,
    tpo: input.tpo,
    worn_at: today,
    weather: input.weather,
    temperature: input.temperature,
  })
  if (result.ok) {
    revalidatePath('/')
    revalidatePath('/events')
  }
  return result
}

export async function resetTodayOutfitAction(outfitId: string) {
  const result = await deleteOutfit(outfitId)
  if (result.ok) {
    revalidatePath('/')
    revalidatePath('/events')
  }
  return result
}
