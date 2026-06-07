-- =====================================================
-- コストトラッキング基盤 (2026-06-07)
-- =====================================================
-- 目的：Replicate / Gemini 等の有料API呼び出しを記録し、
-- ・/admin/costs ダッシュボードでリアルタイム可視化
-- ・ユーザーごとの月間上限を強制（VoC予算の暴走防止）

-- 1) profiles に管理者フラグと個別上限の上書きを追加
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS monthly_cap_jpy_override NUMERIC(10,2);

-- 2) API 使用ログ
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  service       TEXT NOT NULL,
    -- 例: 'replicate_tryon' / 'replicate_lora_train' /
    --     'gemini_outfit_suggest' / 'gemini_style_classify' / 'gemini_style_profile'
  operation     TEXT,
  cost_jpy      NUMERIC(10,2) NOT NULL DEFAULT 0,
  tokens_in     INTEGER,
  tokens_out    INTEGER,
  external_id   TEXT,
  meta          JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_user_date
  ON public.api_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_service_date
  ON public.api_usage_logs(service, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_created_at
  ON public.api_usage_logs(created_at DESC);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- 自分のログは読める
DROP POLICY IF EXISTS "usage_select_own" ON public.api_usage_logs;
CREATE POLICY "usage_select_own" ON public.api_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 管理者は全部読める
DROP POLICY IF EXISTS "usage_select_admin" ON public.api_usage_logs;
CREATE POLICY "usage_select_admin" ON public.api_usage_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- 挿入は自分のものだけ（server side で auth.uid() に紐付け）
DROP POLICY IF EXISTS "usage_insert_own" ON public.api_usage_logs;
CREATE POLICY "usage_insert_own" ON public.api_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 3) profiles の RLS は既存。管理者は他人の profile を読めるようにする
-- （/admin/costs でユーザー名を出すため）
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.is_admin = TRUE
    )
  );
