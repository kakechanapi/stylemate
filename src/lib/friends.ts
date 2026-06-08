// 友人（試着対象人物）の CRUD
// 顔写真の原本は端末内 IndexedDB、Supabase には枚数のみ記録。

import { createSupabaseServerClient } from './supabase/server'
import type { Friend, BodyType, Gender, Relationship } from '@/types/fashion'

export async function listFriends(): Promise<Friend[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .order('is_me', { ascending: false }) // 自分を先頭
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[lib/friends] list error:', error.message)
    return []
  }
  return (data || []) as Friend[]
}

// リッチ表示用：会った回数・最終会った日を付与した型
export type FriendWithMeta = Friend & {
  last_met_at?: string // YYYY-MM-DD
  met_count: number
}

/**
 * 友達一覧 + outfits.met_with_friend_ids から「会った回数」「最終会った日」を集計
 * /friends 一覧のリッチカード表示用
 */
export async function listFriendsWithLastMet(): Promise<FriendWithMeta[]> {
  const supabase = await createSupabaseServerClient()
  const [{ data: friendsData, error: fErr }, { data: outfitsData, error: oErr }] =
    await Promise.all([
      supabase
        .from('friends')
        .select('*')
        .order('is_me', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('outfits')
        .select('worn_at, met_with_friend_ids')
        .order('worn_at', { ascending: false }),
    ])

  if (fErr) {
    console.error('[lib/friends] listWithLastMet friends error:', fErr.message)
    return []
  }
  if (oErr) {
    // outfits 取得失敗しても友達一覧は返す
    console.error('[lib/friends] listWithLastMet outfits error:', oErr.message)
  }

  const friends = (friendsData || []) as Friend[]
  const outfits =
    (outfitsData || []) as { worn_at: string; met_with_friend_ids: string[] | null }[]

  // 友達ID → { last_met_at, count } を集計
  const metaMap = new Map<string, { last_met_at?: string; count: number }>()
  for (const o of outfits) {
    if (!o.met_with_friend_ids || o.met_with_friend_ids.length === 0) continue
    for (const fid of o.met_with_friend_ids) {
      const cur = metaMap.get(fid) || { count: 0 }
      cur.count += 1
      // outfits は worn_at desc 順なので、初回出現が最新
      if (!cur.last_met_at) cur.last_met_at = o.worn_at
      metaMap.set(fid, cur)
    }
  }

  return friends.map((f) => {
    const meta = metaMap.get(f.id)
    return {
      ...f,
      last_met_at: meta?.last_met_at,
      met_count: meta?.count || 0,
    }
  })
}

export async function getFriend(id: string): Promise<Friend | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('friends').select('*').eq('id', id).single()
  if (error) {
    console.error('[lib/friends] get error:', error.message)
    return null
  }
  return data as Friend
}

/**
 * ログインユーザー自身のプロフィール（is_me=true の friends 行）を取得
 * AI コーデ提案で性別・身長・体型を考慮するために使う
 */
export async function getMe(): Promise<Friend | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_me', true)
    .maybeSingle()
  if (error) {
    console.error('[lib/friends] getMe error:', error.message)
    return null
  }
  return (data as Friend) || null
}

export interface NewFriend {
  name: string
  height_cm?: number
  body_type?: BodyType
  gender?: Gender
  birthday?: string
  relationship?: Relationship
  is_me?: boolean
  thumb_url?: string
  face_photo_count?: number
  note?: string
}

export async function createFriend(input: NewFriend): Promise<{
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
    .from('friends')
    .insert({
      user_id: user.id,
      name: input.name,
      height_cm: input.height_cm,
      body_type: input.body_type,
      gender: input.gender,
      birthday: input.birthday,
      relationship: input.relationship,
      is_me: input.is_me || false,
      thumb_url: input.thumb_url,
      face_photo_count: input.face_photo_count || 0,
      lora_status: (input.face_photo_count || 0) >= 5 ? 'pending' : 'none',
      note: input.note,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[lib/friends] create error:', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true, id: data.id }
}

// 友達情報の更新（部分更新OK）
export interface UpdateFriendInput {
  name?: string
  gender?: Gender
  birthday?: string | null // null で削除
  relationship?: Relationship
  thumb_url?: string | null
  note?: string | null
  // 自分のみ
  height_cm?: number | null
  body_type?: BodyType
}

export async function updateFriend(
  id: string,
  input: UpdateFriendInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not authenticated' }

  // undefined のキーは送らない（部分更新）
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) patch[k] = v
  }
  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await supabase
    .from('friends')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[lib/friends] update error:', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function deleteFriend(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('friends').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function updateFacePhotoCount(
  id: string,
  count: number
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('friends')
    .update({
      face_photo_count: count,
      lora_status: count >= 5 ? 'pending' : 'none',
    })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
