'use server'

import { revalidatePath } from 'next/cache'
import { createFriend, deleteFriend, type NewFriend } from '@/lib/friends'

export async function createFriendAction(input: NewFriend) {
  const result = await createFriend(input)
  if (result.ok) {
    revalidatePath('/friends')
    revalidatePath('/')
  }
  return result
}

export async function deleteFriendAction(id: string) {
  const result = await deleteFriend(id)
  if (result.ok) {
    revalidatePath('/friends')
  }
  return result
}
