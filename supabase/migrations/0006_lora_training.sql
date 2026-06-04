-- =====================================================
-- Phase 5: LoRA 本人モード - 訓練フロー用追加
-- =====================================================
-- friends に訓練ID列を追加（ポーリングで使う）+ Storage bucket。
-- 顔写真の zip は短時間だけ Storage に置いて Replicate に渡し、
-- 訓練完了 or 24h で削除する想定。

-- ─── friends に lora_training_id 列を追加 ───
ALTER TABLE public.friends
  ADD COLUMN IF NOT EXISTS lora_training_id TEXT;

-- ─── Storage bucket: lora-training（zipの一時置き場） ───
-- public read（Replicate からアクセスできる必要があるため）。
-- 書き込みは自分のフォルダのみ。Phase 5 では「訓練完了後に削除」を実装。
INSERT INTO storage.buckets (id, name, public)
VALUES ('lora-training', 'lora-training', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "lora_training_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lora-training'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "lora_training_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'lora-training'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "lora_training_read_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lora-training');
