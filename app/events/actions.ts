'use server'

import { revalidatePath } from 'next/cache'
import { createEvent, deleteEvent, type NewEvent } from '@/lib/events'

export async function createEventAction(input: NewEvent) {
  const result = await createEvent(input)
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
