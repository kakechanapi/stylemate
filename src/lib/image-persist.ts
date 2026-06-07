// 外部画像URLを Supabase Storage に永続化する
// 楽天 / Yahoo 等の検索結果の image_url は、ECサイト側の都合で消える/差し替わるリスクがある。
// 服を登録する時点で自前ストレージにコピーすることで、後から画像欠落しないように保証する。
//
// 失敗時は元の URL をそのまま返す（保存フローを止めないため）。

import { createSupabaseServerClient } from './supabase/server'

// 既に Supabase Storage の URL なら true（重複コピー防止）
function isAlreadySupabaseUrl(url: string): boolean {
  return /\/storage\/v1\/object\/public\/clothing-images\//.test(url)
}

// 画像をフェッチして、Supabase Storage の clothing-images バケットに保存。
// 戻り値：Storage の公開 URL（成功時）/ 元のURL（失敗時のフォールバック）
export async function persistExternalImage(
  externalUrl: string,
  opts?: { pathPrefix?: string } // 'thumbs' など
): Promise<string> {
  if (!externalUrl) return externalUrl
  if (isAlreadySupabaseUrl(externalUrl)) return externalUrl

  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return externalUrl

    // 1. 画像取得（5秒タイムアウト）
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(externalUrl, {
      signal: controller.signal,
      // User-Agent 偽装（楽天等の画像CDNが bot を弾く対策）
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StyleMate/1.0)' },
    }).finally(() => clearTimeout(timeoutId))

    if (!res.ok) {
      console.warn('[image-persist] fetch failed:', res.status, externalUrl)
      return externalUrl
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      console.warn('[image-persist] not an image:', contentType)
      return externalUrl
    }

    const buf = Buffer.from(await res.arrayBuffer())
    // サイズチェック（10MB 上限）
    if (buf.byteLength > 10 * 1024 * 1024) {
      console.warn('[image-persist] file too large:', buf.byteLength)
      return externalUrl
    }

    // 2. Storage にアップロード
    const ext = (contentType.split('/')[1] || 'jpg').replace('jpeg', 'jpg').split(';')[0]
    const safeExt = ['jpg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
    const prefix = opts?.pathPrefix ? `${opts.pathPrefix}/` : 'external/'
    const path = `${user.id}/${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`

    const { error } = await supabase.storage
      .from('clothing-images')
      .upload(path, buf, {
        contentType,
        upsert: false,
      })

    if (error) {
      console.warn('[image-persist] upload error:', error.message)
      return externalUrl
    }

    const { data: pub } = supabase.storage.from('clothing-images').getPublicUrl(path)
    return pub.publicUrl || externalUrl
  } catch (e) {
    // ネットワーク・タイムアウト・abort 等
    console.warn('[image-persist] error:', e instanceof Error ? e.message : e)
    return externalUrl
  }
}
