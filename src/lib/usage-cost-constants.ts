// クライアント/サーバー共通で参照する定数のみ。
// supabase 等の Server-only モジュールを import しないこと（クライアントから読まれる）。

export const SERVICE_COSTS_JPY: Record<string, number> = {
  // Replicate
  replicate_tryon: 16,
  replicate_lora_train: 450,
  replicate_sv3d: 18,
  // Gemini
  gemini_outfit_suggest: 0.05,
  gemini_style_classify: 0.05,
  gemini_style_profile: 0.1,
}

export type ServiceId = keyof typeof SERVICE_COSTS_JPY

export const DEFAULT_MONTHLY_CAP_JPY = {
  admin: 1500,
  user: 300,
}
