// クライアント/サーバー共通で参照する定数のみ。
// supabase 等の Server-only モジュールを import しないこと（クライアントから読まれる）。

export const SERVICE_COSTS_JPY: Record<string, number> = {
  // Replicate
  replicate_tryon: 16,
  replicate_lora_train: 450,
  replicate_sv3d: 18,
  // Gemini（gemini-2.5-flash 固定・2026-07 単価 $0.30/M in, $2.50/M out で概算）
  // outfit_suggest は Vision 画像を最大12枚送るため入力トークンが大きい
  // （画像1枚 ≒ 258 tokens。プロンプト+画像で 5〜6k in / 1k out ≒ $0.0045 ≒ 0.7円）
  gemini_outfit_suggest: 0.7,
  // classify は画像1枚 + 短いプロンプト（≒ 0.15円）
  gemini_style_classify: 0.15,
  // style_profile はテキストのみ・flash-lite（≒ 0.05円、余裕を見て 0.1）
  gemini_style_profile: 0.1,
}

export type ServiceId = keyof typeof SERVICE_COSTS_JPY

export const DEFAULT_MONTHLY_CAP_JPY = {
  admin: 1500,
  user: 300,
}
