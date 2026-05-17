-- =====================================================
-- ファッションDXアプリ Supabase スキーマ
-- =====================================================

CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 服アイテム
CREATE TABLE public.clothes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  brand        TEXT,
  category     TEXT NOT NULL CHECK (category IN ('tops','bottoms','outerwear','shoes','bag','accessory','dress','other')),
  color        TEXT,
  image_url    TEXT,
  product_url  TEXT,
  barcode      TEXT,
  tpo_tags     TEXT[] DEFAULT '{}',
  season_tags  TEXT[] DEFAULT '{}',
  wear_count   INTEGER NOT NULL DEFAULT 0,
  last_worn_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- コーデ記録
CREATE TABLE public.outfits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT,
  cloth_ids   UUID[] NOT NULL,
  tpo         TEXT,
  worn_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  weather     TEXT,
  temperature INTEGER,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_clothes_user ON public.clothes(user_id);
CREATE INDEX idx_clothes_category ON public.clothes(category);
CREATE INDEX idx_outfits_user_date ON public.outfits(user_id, worn_at DESC);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clothes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_all" ON public.profiles USING (auth.uid() = id);
CREATE POLICY "clothes_all" ON public.clothes USING (auth.uid() = user_id);
CREATE POLICY "outfits_all" ON public.outfits USING (auth.uid() = user_id);

-- 新規ユーザー自動プロフィール作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTR(NEW.id::text, 1, 8)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
