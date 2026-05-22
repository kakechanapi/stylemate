-- =====================================================
-- Phase 4: AI 試着結果テーブル + Storage bucket
-- =====================================================

CREATE TABLE public.tryons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id   UUID NOT NULL REFERENCES public.friends(id) ON DELETE CASCADE,
  clothing_id UUID NOT NULL REFERENCES public.clothes(id) ON DELETE CASCADE,
  result_url  TEXT,                    -- Supabase Storage の public URL
  model       TEXT NOT NULL DEFAULT 'idm-vton',  -- 将来切り替え用
  prediction_id TEXT,                  -- Replicate prediction ID (debug用)
  status      TEXT NOT NULL DEFAULT 'pending',   -- pending/processing/succeeded/failed
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tryons_user ON public.tryons(user_id, created_at DESC);
CREATE INDEX idx_tryons_friend ON public.tryons(friend_id, created_at DESC);

ALTER TABLE public.tryons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tryons_all" ON public.tryons USING (auth.uid() = user_id);

-- ─── Storage bucket: tryon-results ───
-- 試着結果画像（PNG）を保存。Public read で <img src> から直接表示。
INSERT INTO storage.buckets (id, name, public)
VALUES ('tryon-results', 'tryon-results', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS（自分のファイルだけ書き込める / 読みは public）
CREATE POLICY "tryon_results_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tryon-results'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "tryon_results_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tryon-results'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "tryon_results_read_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tryon-results');
