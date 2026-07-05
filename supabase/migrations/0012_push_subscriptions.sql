-- =====================================================
-- Web Push 購読（毎朝のコーデ通知）
-- =====================================================
-- 1ユーザーが複数端末で購読できるよう endpoint 単位で保持。
-- 配信は Vercel Cron（毎朝7:00 JST）→ /api/cron/morning-push が
-- service role で全購読を読んで送信する（RLS はユーザー操作用）。

CREATE TABLE public.push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subs_insert_own"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subs_select_own"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "push_subs_update_own"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "push_subs_delete_own"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);
