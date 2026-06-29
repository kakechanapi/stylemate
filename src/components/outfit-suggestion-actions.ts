'use server'

// OutfitSuggestionCard 用のサーバーアクション
// - 固定/却下 → 嗜好スワイプに記録
// - 今日のコーデに決定 → outfits テーブルに保存
// - リセット → 今日の outfit を削除して再提案フローへ戻す

import { recordSwipe, recordOutfitChoice } from '@/lib/style'
import { createOutfit, deleteOutfit } from '@/lib/outfits'
import { toJSTDateStr } from '@/lib/date-helpers'
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
  // A/B/C のうち選ばれなかった案の服ID（学習用）。
  // ここに渡された服は NOPE として記録される（採用案に含まれる重複は除外）
  unchosen_cloth_ids?: string[]
  tpo?: string
  weather?: string
  temperature?: number
  name?: string
}) {
  // JST 基準の「今日」を使う。Vercel は UTC なので toISOString だと
  // 日本時間早朝に前日扱いになる不具合があった。
  const today = toJSTDateStr()
  const result = await createOutfit({
    name: input.name || '今日のコーデ',
    cloth_ids: input.cloth_ids,
    tpo: input.tpo,
    worn_at: today,
    weather: input.weather,
    temperature: input.temperature,
  })
  if (result.ok) {
    // 学習フィードバック：採用コーデは LIKE、不採用案は NOPE で記録。
    // 失敗してもコーデ確定自体は成功扱いにする（学習はベストエフォート）
    void recordOutfitChoice({
      chosen_cloth_ids: input.cloth_ids,
      rejected_cloth_ids: input.unchosen_cloth_ids,
    }).catch((e) => console.error('[confirmTodayOutfit] learning record failed:', e))
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
