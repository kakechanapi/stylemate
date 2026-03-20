-- =====================================================
-- 予測市場アプリ — Supabase データベーススキーマ
-- =====================================================

-- ユーザープロフィール（auth.users を拡張）
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  avatar_url    TEXT,
  points        INTEGER NOT NULL DEFAULT 100,  -- 新規登録ボーナス
  total_predictions  INTEGER NOT NULL DEFAULT 0,
  correct_predictions INTEGER NOT NULL DEFAULT 0,
  level         INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 的中率を計算するビュー
CREATE VIEW public.user_stats AS
  SELECT
    id,
    username,
    points,
    level,
    total_predictions,
    correct_predictions,
    CASE
      WHEN total_predictions = 0 THEN 0
      ELSE ROUND((correct_predictions::NUMERIC / total_predictions) * 100, 1)
    END AS accuracy_rate
  FROM public.profiles;

-- 予測マーケット
CREATE TABLE public.predictions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question      TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL CHECK (category IN ('politics', 'economy', 'sports', 'entertainment', 'society', 'tech')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'resolved', 'cancelled')),
  result        TEXT CHECK (result IN ('yes', 'no', 'cancelled')),
  yes_count     INTEGER NOT NULL DEFAULT 0,
  no_count      INTEGER NOT NULL DEFAULT 0,
  closes_at     TIMESTAMPTZ NOT NULL,
  resolved_at   TIMESTAMPTZ,
  source_url    TEXT,
  created_by    UUID REFERENCES public.profiles(id),  -- NULL = AI生成
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- オッズを計算するビュー
CREATE VIEW public.predictions_with_odds AS
  SELECT
    *,
    CASE
      WHEN (yes_count + no_count) = 0 THEN 50
      ELSE ROUND((yes_count::NUMERIC / (yes_count + no_count)) * 100)
    END AS yes_percent,
    CASE
      WHEN (yes_count + no_count) = 0 THEN 50
      ELSE ROUND((no_count::NUMERIC / (yes_count + no_count)) * 100)
    END AS no_percent,
    (yes_count + no_count) AS total_votes
  FROM public.predictions;

-- ユーザーの予測参加
CREATE TABLE public.user_predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prediction_id   UUID NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  choice          TEXT NOT NULL CHECK (choice IN ('yes', 'no')),
  points_wagered  INTEGER NOT NULL DEFAULT 10,
  points_earned   INTEGER,  -- NULL = まだ結果なし
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, prediction_id)  -- 1ユーザー1予測につき1回のみ
);

-- ポイント履歴
CREATE TABLE public.points_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL,  -- 正=獲得, 負=消費
  reason          TEXT NOT NULL,     -- 'login_bonus', 'prediction_correct', 'prediction_wrong', etc.
  prediction_id   UUID REFERENCES public.predictions(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- バッジ定義
CREATE TABLE public.badges (
  id               TEXT PRIMARY KEY,  -- 'first_prediction', 'streak_5', etc.
  name             TEXT NOT NULL,
  description      TEXT NOT NULL,
  icon             TEXT NOT NULL,     -- アイコン文字列 or URL
  condition_type   TEXT NOT NULL,     -- 'total_predictions', 'correct_streak', 'accuracy', etc.
  condition_value  INTEGER NOT NULL
);

-- ユーザーが獲得したバッジ
CREATE TABLE public.user_badges (
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id   TEXT NOT NULL REFERENCES public.badges(id),
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- フレンド関係（双方向に行を持つ）
CREATE TABLE public.friendships (
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- =====================================================
-- インデックス
-- =====================================================
CREATE INDEX idx_predictions_status_closes ON public.predictions(status, closes_at);
CREATE INDEX idx_predictions_category ON public.predictions(category);
CREATE INDEX idx_user_predictions_user ON public.user_predictions(user_id);
CREATE INDEX idx_user_predictions_prediction ON public.user_predictions(prediction_id);
CREATE INDEX idx_points_history_user ON public.points_history(user_id, created_at DESC);
CREATE INDEX idx_friendships_user ON public.friendships(user_id);

-- =====================================================
-- RLS（Row Level Security）ポリシー
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- profiles: 誰でも読める、自分のみ更新可
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- predictions: 誰でも active/resolved は読める
CREATE POLICY "predictions_select" ON public.predictions FOR SELECT USING (status != 'cancelled');
CREATE POLICY "predictions_insert" ON public.predictions FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "predictions_update" ON public.predictions FOR UPDATE USING (auth.role() = 'service_role');

-- user_predictions: 自分の参加のみ読み書き
CREATE POLICY "user_predictions_select" ON public.user_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_predictions_insert" ON public.user_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- points_history: 自分のみ読める
CREATE POLICY "points_history_select" ON public.points_history FOR SELECT USING (auth.uid() = user_id);

-- user_badges: 誰でも読める
CREATE POLICY "user_badges_select" ON public.user_badges FOR SELECT USING (true);

-- friendships: 自分の関係のみ操作可
CREATE POLICY "friendships_select" ON public.friendships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "friendships_insert" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "friendships_delete" ON public.friendships FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- トリガー: 新規ユーザー登録時にプロフィール自動作成
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTR(NEW.id::text, 1, 8)));

  -- 新規登録ボーナス
  INSERT INTO public.points_history (user_id, amount, reason)
  VALUES (NEW.id, 100, 'signup_bonus');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- トリガー: 予測参加時に yes_count / no_count を更新
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_user_prediction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.choice = 'yes' THEN
    UPDATE public.predictions SET yes_count = yes_count + 1 WHERE id = NEW.prediction_id;
  ELSE
    UPDATE public.predictions SET no_count = no_count + 1 WHERE id = NEW.prediction_id;
  END IF;

  -- ポイント消費記録
  INSERT INTO public.points_history (user_id, amount, reason, prediction_id)
  VALUES (NEW.user_id, -NEW.points_wagered, 'prediction_entry', NEW.prediction_id);

  -- プロフィールのポイント・予測数を更新
  UPDATE public.profiles
  SET
    points = points - NEW.points_wagered,
    total_predictions = total_predictions + 1,
    updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_prediction_created
  AFTER INSERT ON public.user_predictions
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_prediction();

-- =====================================================
-- 初期バッジデータ
-- =====================================================
INSERT INTO public.badges (id, name, description, icon, condition_type, condition_value) VALUES
  ('first_prediction',  '初予測者',       '初めての予測に参加した',          '🎯', 'total_predictions', 1),
  ('prediction_10',     '予測の入門者',   '予測に10回参加した',              '📊', 'total_predictions', 10),
  ('prediction_50',     '予測の達人',     '予測に50回参加した',              '🏆', 'total_predictions', 50),
  ('prediction_100',    '予測の神',       '予測に100回参加した',             '⚡', 'total_predictions', 100),
  ('accuracy_70',       '的中率70%',      '的中率が70%を超えた',             '🎖️', 'accuracy', 70),
  ('accuracy_80',       '的中率80%',      '的中率が80%を超えた',             '💎', 'accuracy', 80),
  ('streak_3',          '3連続的中',      '3回連続で的中した',               '🔥', 'correct_streak', 3),
  ('streak_5',          '5連続的中',      '5回連続で的中した',               '🌟', 'correct_streak', 5),
  ('streak_10',         '10連続的中',     '10回連続で的中した（伝説）',       '👑', 'correct_streak', 10),
  ('politics_expert',   '政治予測の神',   '政治カテゴリで10問的中した',       '🗳️', 'category_correct_politics', 10),
  ('sports_expert',     'スポーツ番長',   'スポーツカテゴリで10問的中した',   '⚽', 'category_correct_sports', 10);
