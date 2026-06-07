'use server'

import { revalidatePath } from 'next/cache'
import { createOutfit, deleteOutfit, updateOutfit, type NewOutfit } from '@/lib/outfits'
import { normalizeActionResult } from '@/lib/action-helpers'

export async function createOutfitAction(input: NewOutfit) {
  const result = await createOutfit(input)
  if (result.ok) {
    revalidatePath('/calendar')
    revalidatePath('/events')
    revalidatePath('/')
    revalidatePath('/outfits')
  }
  return normalizeActionResult(result, { fallbackMessage: '着用記録の保存に失敗しました' })
}

export async function updateOutfitAction(id: string, patch: Partial<NewOutfit>) {
  const result = await updateOutfit(id, patch)
  if (result.ok) {
    revalidatePath('/calendar')
    revalidatePath('/events')
    revalidatePath('/')
    revalidatePath('/outfits')
  }
  return normalizeActionResult(result, { fallbackMessage: '着用記録の更新に失敗しました' })
}

export async function deleteOutfitAction(id: string) {
  const result = await deleteOutfit(id)
  if (result.ok) {
    revalidatePath('/calendar')
    revalidatePath('/events')
    revalidatePath('/')
    revalidatePath('/outfits')
  }
  return normalizeActionResult(result, { fallbackMessage: '着用記録の削除に失敗しました' })
}
