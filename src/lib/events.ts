// 予定（events）の CRUD
import { createSupabaseServerClient } from './supabase/server'

export interface EventItem {
  id: string
  user_id: string
  title: string
  starts_at: string // ISO timestamp
  tpo?: string
  friend_ids: string[]
  location?: string
  note?: string
  created_at: string
}

export interface NewEvent {
  title: string
  starts_at: string
  tpo?: string
  friend_ids?: string[]
  location?: string
  note?: string
}

export async function listEvents(opts?: {
  from?: string // ISO
  to?: string
  limit?: number
}): Promise<EventItem[]> {
  const supabase = await createSupabaseServerClient()
  let q = supabase.from('events').select('*').order('starts_at', { ascending: true })
  if (opts?.from) q = q.gte('starts_at', opts.from)
  if (opts?.to) q = q.lte('starts_at', opts.to)
  if (opts?.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) {
    console.error('[lib/events] list error:', error.message)
    return []
  }
  return (data || []) as EventItem[]
}

export async function listUpcoming(days = 7): Promise<EventItem[]> {
  const now = new Date()
  const to = new Date(now.getTime() + days * 86400_000)
  return listEvents({ from: now.toISOString(), to: to.toISOString() })
}

export async function createEvent(input: NewEvent): Promise<{
  ok: boolean
  id?: string
  error?: string
}> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not authenticated' }

  const { data, error } = await supabase
    .from('events')
    .insert({
      user_id: user.id,
      title: input.title,
      starts_at: input.starts_at,
      tpo: input.tpo,
      friend_ids: input.friend_ids || [],
      location: input.location,
      note: input.note,
    })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data.id }
}

export async function updateEvent(
  id: string,
  patch: Partial<NewEvent>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('events').update(patch).eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function getEvent(id: string): Promise<EventItem | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('events').select('*').eq('id', id).single()
  if (error) return null
  return data as EventItem
}

export async function deleteEvent(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * 直近一定期間で「特定の友人と会った時」に着た服のIDを取得（被り回避用）。
 */
export async function recentClothesWithFriends(
  friendIds: string[],
  limit = 5
): Promise<string[]> {
  if (friendIds.length === 0) return []
  const supabase = await createSupabaseServerClient()
  // overlap operator で配列の交差をフィルタ
  const { data, error } = await supabase
    .from('outfits')
    .select('cloth_ids')
    .overlaps('met_with_friend_ids', friendIds)
    .order('worn_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[lib/events] recentClothesWithFriends error:', error.message)
    return []
  }
  const ids = new Set<string>()
  ;(data || []).forEach((o) => (o.cloth_ids as string[]).forEach((id) => ids.add(id)))
  return Array.from(ids)
}
