'use server'

import { revalidatePath } from 'next/cache'
import { createEvent, deleteEvent, updateEvent, type NewEvent } from '@/lib/events'
import { normalizeActionResult } from '@/lib/action-helpers'

export async function createEventAction(input: NewEvent) {
  const result = await createEvent(input)
  if (result.ok) {
    revalidatePath('/events')
    revalidatePath('/calendar')
    revalidatePath('/')
  }
  return normalizeActionResult(result, { fallbackMessage: '予定の作成に失敗しました' })
}

export async function updateEventAction(id: string, patch: Partial<NewEvent>) {
  const result = await updateEvent(id, patch)
  if (result.ok) {
    revalidatePath('/events')
    revalidatePath('/calendar')
    revalidatePath('/')
  }
  return normalizeActionResult(result, { fallbackMessage: '予定の更新に失敗しました' })
}

export async function deleteEventAction(id: string) {
  const result = await deleteEvent(id)
  if (result.ok) {
    revalidatePath('/events')
    revalidatePath('/calendar')
    revalidatePath('/')
  }
  return normalizeActionResult(result, { fallbackMessage: '予定の削除に失敗しました' })
}
