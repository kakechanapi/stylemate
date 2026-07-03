-- =====================================================
-- プロダクト計測イベント（D1/D7 リテンション・ファネル分析用）
-- =====================================================
-- 主要イベント：
--   outfit_suggested  … AI コーデ提案を生成した
--   outfit_confirmed  … 「今日の服に決定」した
--   cloth_registered  … 服を登録した
--   tryon_generated   … コーデ試着（自分姿）を生成した
--
-- リテンションは created_at をユーザー単位で日別集計すれば出る。
-- 個人を特定する内容は meta に入れないこと。

CREATE TABLE public.app_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event      TEXT NOT NULL,
  meta       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_events_user ON public.app_events(user_id, created_at DESC);
CREATE INDEX idx_app_events_event ON public.app_events(event, created_at DESC);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のイベントを insert できるだけ（読み取りは管理者がダッシュボードで行う）
CREATE POLICY "app_events_insert_own"
  ON public.app_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 管理者のみ select 可（/admin 系での集計表示用）
CREATE POLICY "app_events_select_admin"
  ON public.app_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );
