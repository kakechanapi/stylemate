'use server'

import { revalidatePath } from 'next/cache'
import { createClothing, type NewClothing } from '@/lib/clothes'

export async function saveClothingAction(input: NewClothing) {
  const result = await createClothing(input)
  if (result.ok) {
    revalidatePath('/closet')
    revalidatePath('/')
  }
  return result
}
