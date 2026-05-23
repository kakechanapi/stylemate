-- =====================================================
-- Phase 7: 予定（events）+ 被り回避（outfits に誰と会ったか追加）
-- =====================================================

-- ─── events（予定）テーブル ───
-- ユーザーが入力する予定。「19:00 鈴木さんとイタリアン」等。
-- friend_ids で「誰と会うか」を紐付け → 被り回避 AI で活用。
CREATE TABLE public.events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,                -- "イタリアン", "ピクニック" 等
  starts_at      TIMESTAMPTZ NOT NULL,         -- 日時
  tpo            TEXT,                         -- "casual" / "work" / "date" 等（自動推測 or 任意）
  friend_ids     UUID[] NOT NULL DEFAULT '{}', -- 誰と会うか（friends.id 配列）
  location       TEXT,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_user_starts ON public.events(user_id, starts_at);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_all" ON public.events USING (auth.uid() = user_id);

-- ─── outfits に「誰と会った時に着たか」追加 ───
ALTER TABLE public.outfits
  ADD COLUMN IF NOT EXISTS met_with_friend_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_outfits_metwith ON public.outfits USING GIN (met_with_friend_ids);
