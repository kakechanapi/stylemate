-- =====================================================
-- Phase 3: 友人マルチ写真登録のためのテーブル追加
-- =====================================================
-- 「友人」 = 試着対象の人物（自分自身も is_me=true で1人）
-- 顔写真原本は端末内 IndexedDB に保存し、Supabase には枚数だけ記録。
-- LoRA訓練後の URL を lora_url に保存（Phase 5で利用）。

CREATE TABLE public.friends (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  height_cm         INTEGER,                  -- 身長
  body_type         TEXT,                     -- "スリム" / "ふつう" / "がっしり"
  gender            TEXT,                     -- "男性" / "女性" / "指定しない"
  birthday          DATE,
  relationship      TEXT,                     -- "友達" / "家族" / "恋人" / "自分" / "その他"
  is_me             BOOLEAN NOT NULL DEFAULT false,

  -- プロフィール画像（小さい・サムネ用、Supabase Storage）
  thumb_url         TEXT,

  -- 本人モード（LoRA）
  face_photo_count  INTEGER NOT NULL DEFAULT 0,  -- 端末側の枚数を記録（実画像はIDB）
  lora_status       TEXT NOT NULL DEFAULT 'none', -- 'none'/'pending'/'training'/'ready'/'failed'
  lora_url          TEXT,                          -- 訓練済みLoRA（Replicateモデル）URL
  lora_trained_at   TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_friends_user ON public.friends(user_id);
CREATE INDEX idx_friends_user_isme ON public.friends(user_id, is_me);

-- RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friends_all" ON public.friends USING (auth.uid() = user_id);

-- 1ユーザーにつき is_me=true は1人まで
CREATE UNIQUE INDEX uniq_friends_me_per_user
  ON public.friends(user_id)
  WHERE is_me = true;
