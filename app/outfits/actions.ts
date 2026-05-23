'use server'

import { revalidatePath } from 'next/cache'
import { createOutfit, deleteOutfit, type NewOutfit } from '@/lib/outfits'

export async function createOutfitAction(input: NewOutfit) {
  const result = await createOutfit(input)
  if (result.ok) {
    revalidatePath('/calendar')
    revalidatePath('/')
    revalidatePath('/outfits')
  }
  return result
}

export async function deleteOutfitAction(id: string) {
  const result = await deleteOutfit(id)
  if (result.ok) {
    revalidatePath('/calendar')
    revalidatePath('/')
    revalidatePath('/outfits')
  }
  return result
}
