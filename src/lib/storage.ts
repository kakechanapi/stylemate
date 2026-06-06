// クライアント側で Supabase Storage にファイルをアップロード

import { createSupabaseBrowserClient } from './supabase/client'

export async function uploadClothingImage(file: File): Promise<{
  ok: boolean
  url?: string
  error?: string
}> {
  const supabase = createSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not authenticated' }

  // ファイル名：[userId]/[timestamp]-[random].[ext]
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`

  const { error } = await supabase.storage.from('clothing-images').upload(path, file, {
    contentType: file.type || `image/${safeExt}`,
    upsert: false,
  })

  if (error) {
    console.error('[storage] upload error:', error.message)
    return { ok: false, error: error.message }
  }

  const { data: pub } = supabase.storage.from('clothing-images').getPublicUrl(path)
  return { ok: true, url: pub.publicUrl }
}

// 友達のサムネイル画像（公開URL）
// 既存の 'clothing-images' バケットを再利用してパス接頭辞で区別する。
// 友達は本人モード（LoRA）を使わないので IndexedDB は不要、Supabase に直接保存。
export async function uploadFriendThumb(file: File): Promise<{
  ok: boolean
  url?: string
  error?: string
}> {
  const supabase = createSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not authenticated' }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  const path = `${user.id}/friends/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`

  const { error } = await supabase.storage.from('clothing-images').upload(path, file, {
    contentType: file.type || `image/${safeExt}`,
    upsert: false,
  })

  if (error) {
    console.error('[storage] friend thumb upload error:', error.message)
    return { ok: false, error: error.message }
  }

  const { data: pub } = supabase.storage.from('clothing-images').getPublicUrl(path)
  return { ok: true, url: pub.publicUrl }
}
