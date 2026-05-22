'use server'

import { revalidatePath } from 'next/cache'
import { deleteClothing } from '@/lib/clothes'

export async function deleteClothingAction(id: string) {
  const result = await deleteClothing(id)
  if (result.ok) {
    revalidatePath('/closet')
    revalidatePath('/')
  }
  return result
}
