'use server'

import { revalidatePath } from 'next/cache'
import { createOutfit, deleteOutfit, updateOutfit, type NewOutfit } from '@/lib/outfits'

export async function createOutfitAction(input: NewOutfit) {
  const result = await createOutfit(input)
  if (result.ok) {
    revalidatePath('/calendar')
    revalidatePath('/events')
    revalidatePath('/')
    revalidatePath('/outfits')
  }
  return result
}

export async function updateOutfitAction(id: string, patch: Partial<NewOutfit>) {
  const result = await updateOutfit(id, patch)
  if (result.ok) {
    revalidatePath('/calendar')
    revalidatePath('/events')
    revalidatePath('/')
    revalidatePath('/outfits')
  }
  return result
}

export async function deleteOutfitAction(id: string) {
  const result = await deleteOutfit(id)
  if (result.ok) {
    revalidatePath('/calendar')
    revalidatePath('/events')
    revalidatePath('/')
    revalidatePath('/outfits')
  }
  return result
}
