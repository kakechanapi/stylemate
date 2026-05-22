// 試着結果（tryons）の読み込み

import { createSupabaseServerClient } from './supabase/server'

export interface Tryon {
  id: string
  user_id: string
  friend_id: string
  clothing_id: string
  result_url?: string
  model: string
  prediction_id?: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed'
  error?: string
  created_at: string
}

export async function listTryons(opts?: { friendId?: string; limit?: number }): Promise<Tryon[]> {
  const supabase = await createSupabaseServerClient()
  let q = supabase.from('tryons').select('*').order('created_at', { ascending: false })
  if (opts?.friendId) q = q.eq('friend_id', opts.friendId)
  if (opts?.limit) q = q.limit(opts.limit)

  const { data, error } = await q
  if (error) {
    console.error('[lib/tryons] list error:', error.message)
    return []
  }
  return (data || []) as Tryon[]
}

export async function getTryon(id: string): Promise<Tryon | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('tryons').select('*').eq('id', id).single()
  if (error) return null
  return data as Tryon
}
