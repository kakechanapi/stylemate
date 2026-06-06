'use server'

import { revalidatePath } from 'next/cache'
import {
  createFriend,
  deleteFriend,
  updateFriend,
  type NewFriend,
  type UpdateFriendInput,
} from '@/lib/friends'

export async function createFriendAction(input: NewFriend) {
  const result = await createFriend(input)
  if (result.ok) {
    revalidatePath('/friends')
    revalidatePath('/')
  }
  return result
}

export async function updateFriendAction(id: string, input: UpdateFriendInput) {
  const result = await updateFriend(id, input)
  if (result.ok) {
    revalidatePath('/friends')
    revalidatePath(`/friends/${id}`)
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
