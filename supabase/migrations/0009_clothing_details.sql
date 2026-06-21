-- 0009_clothing_details.sql
-- clothes テーブルに「服の詳細特徴」カラムを追加。
-- 目的：AI コーデ提案が「ブラウス＝透ける＝中にキャミ要」みたいな判断ができるよう、
--      テキスト情報を充実させる。これまでは画像 Vision 解析のみで毎回コストがかかっていた。

ALTER TABLE clothes
  ADD COLUMN IF NOT EXISTS material TEXT,        -- 素材：リネン / コットン / ウール / ナイロン / ポリエステル / シルク / カシミヤ / デニム 等
  ADD COLUMN IF NOT EXISTS silhouette TEXT,      -- シルエット：タイト / レギュラー / ルーズ / オーバーサイズ / Aライン / フレア 等
  ADD COLUMN IF NOT EXISTS pattern TEXT,         -- 柄：無地 / ボーダー / ストライプ / チェック / 花柄 / ドット / アニマル 等
  ADD COLUMN IF NOT EXISTS neckline TEXT,        -- 首元：クルー / Vネック / タートル / オフショル / ボートネック / ハイネック 等（トップス/ワンピース）
  ADD COLUMN IF NOT EXISTS sleeve_type TEXT,     -- 袖：半袖 / 長袖 / 七分袖 / ノースリーブ / パフ / フレア 等
  ADD COLUMN IF NOT EXISTS length_type TEXT,     -- 丈感：ショート / ミドル / ロング / マキシ / ミニ / ミディ 等
  ADD COLUMN IF NOT EXISTS transparency TEXT,    -- 透け感：none / slight / significant
  ADD COLUMN IF NOT EXISTS features TEXT[];      -- その他の自由特徴ラベル（例：['フリル', 'リブ編み', '裏起毛']）

-- 既存行は NULL のまま。新規登録 or ユーザー編集で埋まる。
-- 検索やフィルタを将来やる時のために、よく使いそうなものに index：
CREATE INDEX IF NOT EXISTS idx_clothes_material ON clothes (material) WHERE material IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clothes_silhouette ON clothes (silhouette) WHERE silhouette IS NOT NULL;

COMMENT ON COLUMN clothes.material IS 'リネン/コットン/ウール等の素材';
COMMENT ON COLUMN clothes.silhouette IS 'タイト/ルーズ/オーバーサイズ等';
COMMENT ON COLUMN clothes.pattern IS '無地/チェック/花柄等';
COMMENT ON COLUMN clothes.neckline IS 'Vネック/クルー/タートル等';
COMMENT ON COLUMN clothes.sleeve_type IS '半袖/長袖/ノースリーブ等';
COMMENT ON COLUMN clothes.length_type IS 'ショート/ミドル/ロング等';
COMMENT ON COLUMN clothes.transparency IS 'none/slight/significant';
COMMENT ON COLUMN clothes.features IS 'その他自由特徴ラベル配列';
