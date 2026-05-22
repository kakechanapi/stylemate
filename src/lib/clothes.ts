// 服アイテムの CRUD（Server Component / Server Action 専用）
// RLS により auth.uid() = user_id しか触れない。

import { createSupabaseServerClient } from './supabase/server'
import type { ClothingItem, Category } from '@/types/fashion'

export async function listClothes(filter?: { category?: Category }): Promise<ClothingItem[]> {
  const supabase = await createSupabaseServerClient()
  let q = supabase
    .from('clothes')
    .select('*')
    .order('created_at', { ascending: false })

  if (filter?.category) {
    q = q.eq('category', filter.category)
  }

  const { data, error } = await q
  if (error) {
    console.error('[lib/clothes] list error:', error.message)
    return []
  }
  return (data || []) as ClothingItem[]
}

export async function countClothes(): Promise<number> {
  const supabase = await createSupabaseServerClient()
  const { count, error } = await supabase
    .from('clothes')
    .select('id', { count: 'exact', head: true })
  if (error) {
    console.error('[lib/clothes] count error:', error.message)
    return 0
  }
  return count || 0
}

export interface NewClothing {
  name: string
  brand?: string
  category: Category
  color?: string
  image_url?: string
  product_url?: string
  tpo_tags?: string[]
  season_tags?: string[]
}

export async function createClothing(input: NewClothing): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not authenticated' }

  const { error } = await supabase.from('clothes').insert({
    user_id: user.id,
    name: input.name,
    brand: input.brand,
    category: input.category,
    color: input.color,
    image_url: input.image_url,
    product_url: input.product_url,
    tpo_tags: input.tpo_tags || [],
    season_tags: input.season_tags || [],
  })

  if (error) {
    console.error('[lib/clothes] create error:', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function deleteClothing(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('clothes').delete().eq('id', id)
  if (error) {
    console.error('[lib/clothes] delete error:', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function incrementWearCount(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient()
  // 着用回数 +1、最終着用日を更新
  const { data: current } = await supabase
    .from('clothes')
    .select('wear_count')
    .eq('id', id)
    .single()
  await supabase
    .from('clothes')
    .update({
      wear_count: (current?.wear_count || 0) + 1,
      last_worn_at: new Date().toISOString(),
    })
    .eq('id', id)
}
