'use server'

import { revalidatePath } from 'next/cache'
import { deleteClothing, updateClothing, type NewClothing } from '@/lib/clothes'

export async function deleteClothingAction(id: string) {
  const result = await deleteClothing(id)
  if (result.ok) {
    revalidatePath('/closet')
    revalidatePath('/')
  }
  return result
}

export async function updateClothingAction(id: string, patch: Partial<NewClothing>) {
  const result = await updateClothing(id, patch)
  if (result.ok) {
    revalidatePath('/closet')
    revalidatePath('/')
  }
  return result
}
