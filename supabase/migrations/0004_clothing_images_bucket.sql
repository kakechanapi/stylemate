-- =====================================================
-- 服画像のアップロード用 Storage bucket
-- =====================================================

-- ─── bucket 作成（public read） ───
INSERT INTO storage.buckets (id, name, public)
VALUES ('clothing-images', 'clothing-images', true)
ON CONFLICT (id) DO NOTHING;

-- ─── Storage RLS ───
-- 自分のフォルダ（auth.uid()/...）にだけ書き込める / 読みは public

CREATE POLICY "clothing_images_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'clothing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "clothing_images_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'clothing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "clothing_images_read_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'clothing-images');
