'use server'

import { revalidatePath } from 'next/cache'
import { createClothing, type NewClothing } from '@/lib/clothes'
import { persistExternalImage } from '@/lib/image-persist'
import { normalizeActionResult } from '@/lib/action-helpers'

export async function saveClothingAction(input: NewClothing) {
  // 外部画像URL（楽天・Yahoo等の検索結果）は Supabase Storage にコピーして永続化
  // → 外部側で画像が消えてもクローゼットに残るようにする
  let imageUrl = input.image_url
  if (imageUrl) {
    imageUrl = await persistExternalImage(imageUrl)
  }

  const result = await createClothing({ ...input, image_url: imageUrl })
  if (result.ok) {
    revalidatePath('/closet')
    revalidatePath('/')
  }
  return normalizeActionResult(result, { fallbackMessage: '服の登録に失敗しました' })
}
