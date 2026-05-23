-- =====================================================
-- Phase 8: Tinder式好み学習用テーブル
-- =====================================================

-- ─── スワイプ履歴 ───
-- 表示した服画像と、ユーザーの好き/嫌い判定を1行1判定で記録
CREATE TABLE public.style_swipes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,             -- 判定対象の画像 URL
  item_name   TEXT,                      -- 商品名（系統推定の補助）
  brand       TEXT,
  liked       BOOLEAN NOT NULL,          -- true=好き / false=嫌い
  source      TEXT,                      -- "rakuten" / "user_closet" / "manual"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_style_swipes_user ON public.style_swipes(user_id, created_at DESC);

ALTER TABLE public.style_swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "style_swipes_all" ON public.style_swipes USING (auth.uid() = user_id);

-- ─── ユーザーの推定嗜好（系統） ───
-- Gemini がスワイプ履歴から推定したスタイル系統を保存。
-- 上書きしながら使う想定（user_id 1行）。
CREATE TABLE public.style_profiles (
  user_id        UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tags           TEXT[] NOT NULL DEFAULT '{}',    -- ["きれいめ", "カジュアル"] 等
  summary        TEXT,                            -- AI 生成の自然文サマリー
  swipe_count    INTEGER NOT NULL DEFAULT 0,      -- 推定に使ったスワイプ数
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.style_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "style_profiles_all" ON public.style_profiles USING (auth.uid() = user_id);
