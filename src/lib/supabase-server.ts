import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Next.js Server Components / Route Handlers 用（サーバーサイド）
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // 未設定時はダミークライアントを返す（デモ表示用）
    return createClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-key'
    )
  }

  return createClient<Database>(url, key)
}
