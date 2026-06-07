'use server'

import { revalidatePath } from 'next/cache'
import {
  createFriend,
  deleteFriend,
  updateFriend,
  type NewFriend,
  type UpdateFriendInput,
} from '@/lib/friends'
import { normalizeActionResult } from '@/lib/action-helpers'

export async function createFriendAction(input: NewFriend) {
  const result = await createFriend(input)
  if (result.ok) {
    revalidatePath('/friends')
    revalidatePath('/')
  }
  return normalizeActionResult(result, { fallbackMessage: '友達の登録に失敗しました' })
}

export async function updateFriendAction(id: string, input: UpdateFriendInput) {
  const result = await updateFriend(id, input)
  if (result.ok) {
    revalidatePath('/friends')
    revalidatePath(`/friends/${id}`)
    revalidatePath('/')
  }
  return normalizeActionResult(result, { fallbackMessage: '友達の更新に失敗しました' })
}

export async function deleteFriendAction(id: string) {
  const result = await deleteFriend(id)
  if (result.ok) {
    revalidatePath('/friends')
  }
  return normalizeActionResult(result, { fallbackMessage: '友達の削除に失敗しました' })
}
