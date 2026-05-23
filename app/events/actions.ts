'use server'

import { revalidatePath } from 'next/cache'
import { createEvent, deleteEvent, updateEvent, type NewEvent } from '@/lib/events'

export async function createEventAction(input: NewEvent) {
  const result = await createEvent(input)
  if (result.ok) {
    revalidatePath('/events')
    revalidatePath('/calendar')
    revalidatePath('/')
  }
  return result
}

export async function updateEventAction(id: string, patch: Partial<NewEvent>) {
  const result = await updateEvent(id, patch)
  if (result.ok) {
    revalidatePath('/events')
    revalidatePath('/calendar')
    revalidatePath('/')
  }
  return result
}

export async function deleteEventAction(id: string) {
  const result = await deleteEvent(id)
  if (result.ok) {
    revalidatePath('/events')
    revalidatePath('/calendar')
    revalidatePath('/')
  }
  return result
}
