'use server'

import { createFriend } from '@/lib/friends'
import type { Gender, Relationship } from '@/types/fashion'
import { revalidatePath } from 'next/cache'

// 着用記録の編集画面・新規作成画面から、その場で友達を追加するためのサーバーアクション。
// 友達は身長・体型は不要（試着・本人モードを使わないため）。
// 性別・誕生日・関係性・写真は登録可能。
export async function quickAddFriendAction(input: {
  name: string
  gender?: Gender
  birthday?: string // YYYY-MM-DD
  relationship?: Relationship
  note?: string
}): Promise<{
  ok: boolean
  id?: string
  name?: string
  error?: string
}> {
  const trimmed = input.name.trim()
  if (!trimmed) return { ok: false, error: '名前を入力してください' }
  if (trimmed.length > 30) return { ok: false, error: '名前は30文字以内' }

  const result = await createFriend({
    name: trimmed,
    gender: input.gender,
    birthday: input.birthday || undefined,
    relationship: input.relationship,
    note: input.note?.trim() || undefined,
  })
  if (!result.ok) return { ok: false, error: result.error }

  revalidatePath('/friends')
  revalidatePath('/outfits/new')
  revalidatePath('/events')

  return { ok: true, id: result.id, name: trimmed }
}
