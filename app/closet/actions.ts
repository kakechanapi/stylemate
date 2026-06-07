'use server'

import { revalidatePath } from 'next/cache'
import { deleteClothing, updateClothing, type NewClothing } from '@/lib/clothes'
import { persistExternalImage } from '@/lib/image-persist'
import { normalizeActionResult } from '@/lib/action-helpers'

export async function deleteClothingAction(id: string) {
  const result = await deleteClothing(id)
  if (result.ok) {
    revalidatePath('/closet')
    revalidatePath('/')
  }
  return normalizeActionResult(result, { fallbackMessage: '削除に失敗しました' })
}

export async function updateClothingAction(id: string, patch: Partial<NewClothing>) {
  // 編集で画像URLが変更された場合も同様に永続化
  let next = patch
  if (patch.image_url) {
    const persisted = await persistExternalImage(patch.image_url)
    next = { ...patch, image_url: persisted }
  }
  const result = await updateClothing(id, next)
  if (result.ok) {
    revalidatePath('/closet')
    revalidatePath('/')
  }
  return normalizeActionResult(result, { fallbackMessage: '更新に失敗しました' })
}
