// 着用コーデ記録（outfits）の CRUD

import { createSupabaseServerClient } from './supabase/server'
import type { Outfit } from '@/types/fashion'

export async function listOutfits(opts?: {
  from?: string // YYYY-MM-DD
  to?: string
}): Promise<Outfit[]> {
  const supabase = await createSupabaseServerClient()
  let q = supabase.from('outfits').select('*').order('worn_at', { ascending: false })
  if (opts?.from) q = q.gte('worn_at', opts.from)
  if (opts?.to) q = q.lte('worn_at', opts.to)

  const { data, error } = await q
  if (error) {
    console.error('[lib/outfits] list error:', error.message)
    return []
  }
  return (data || []) as Outfit[]
}

export interface NewOutfit {
  name?: string
  cloth_ids: string[]
  tpo?: string
  worn_at: string // YYYY-MM-DD
  weather?: string
  temperature?: number
  note?: string
  met_with_friend_ids?: string[]
}

export async function createOutfit(input: NewOutfit): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not authenticated' }

  const { error } = await supabase.from('outfits').insert({
    user_id: user.id,
    name: input.name,
    cloth_ids: input.cloth_ids,
    tpo: input.tpo,
    worn_at: input.worn_at,
    weather: input.weather,
    temperature: input.temperature,
    note: input.note,
    met_with_friend_ids: input.met_with_friend_ids || [],
  })
  if (error) {
    console.error('[lib/outfits] create error:', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function deleteOutfit(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('outfits').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function getOutfit(id: string): Promise<Outfit | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('outfits').select('*').eq('id', id).single()
  if (error) return null
  return data as Outfit
}

export async function updateOutfit(
  id: string,
  patch: Partial<NewOutfit>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('outfits').update(patch).eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
