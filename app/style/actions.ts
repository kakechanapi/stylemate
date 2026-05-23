'use server'

import { revalidatePath } from 'next/cache'
import { recordSwipe, refreshStyleProfile } from '@/lib/style'

export async function recordSwipeAction(input: {
  image_url: string
  item_name?: string
  brand?: string
  liked: boolean
  source?: string
}) {
  return await recordSwipe(input)
}

export async function refreshStyleProfileAction() {
  const result = await refreshStyleProfile()
  if (result.ok) {
    revalidatePath('/style')
    revalidatePath('/my')
    revalidatePath('/')
  }
  return result
}
