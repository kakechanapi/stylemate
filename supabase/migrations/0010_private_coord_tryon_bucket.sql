-- =====================================================
-- コーデ試着（自分姿）結果の private バケット
-- =====================================================
-- 顔が映る画像なので public バケット（tryon-results）ではなく
-- private バケット + 期限付き signed URL で配信する。
-- 友人試着（tryon-results）は既存のまま（別途移行を検討）。

INSERT INTO storage.buckets (id, name, public)
VALUES ('coord-tryon-results', 'coord-tryon-results', false)
ON CONFLICT (id) DO NOTHING;

-- 自分のフォルダ（先頭セグメント = auth.uid()）だけ読み書きできる
CREATE POLICY "coord_tryon_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'coord-tryon-results'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- upsert（既存ファイルの上書き）に必要
CREATE POLICY "coord_tryon_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'coord-tryon-results'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- signed URL の発行・キャッシュ検索（list）に必要
CREATE POLICY "coord_tryon_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'coord-tryon-results'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "coord_tryon_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'coord-tryon-results'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
