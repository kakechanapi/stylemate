# StyleMate 着手計画

各 Phase の **入る前条件 / やること / 完了条件** を明記。
1 Phase ずつ「ここまで動いた」と確認しながら進める。

---

## Phase 0：下準備（着手前）

### 入る前条件
- [x] CLAUDE.md / MIGRATION_INVENTORY.md / MIGRATION_PLAN.md 作成済み
- [ ] **kakechanapi が tomson を fork → kakechanapi/stylemate**（手動）
- [ ] ローカルディレクトリを `/Users/kakeru.hamamura/FX/stylemate/` に rename
- [ ] git remote を fork した URL に切り替え

### やること
1. fork 完了確認
2. ローカル clone を新リポと同期（既存 weather-coord/ を rename + remote切替 で再利用）
3. Supabase プロジェクト作成（または既存 tomson 用の流用）
4. `.env.local` セットアップ：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENWEATHER_API_KEY`
   - `RAKUTEN_ACCESS_KEY`
   - `GEMINI_API_KEY`
   - `REPLICATE_API_TOKEN`
5. `npm install` + `npm run dev` で動作確認
6. Vercel に新プロジェクト `stylemate` を作成 + 環境変数登録

### 完了条件
- `npm run dev` でローカル起動できる
- Vercel に `stylemate` プロジェクトが立っている
- Supabase 接続が動く

---

## Phase 1：認証 + 基本ログイン UI

### やること
- Supabase Auth UI（メール / Google）
- ログイン / ログアウト / プロフィール初期化
- 認証状態に応じたナビゲーション制御

### 完了条件
- ユーザーがログインしてホーム画面を見られる
- `auth.uid()` が動き、RLS が機能している

---

## Phase 2：tomson の mock → Supabase 実データ化

### やること
- ホーム・クローゼット・カレンダーで使われている mock データを Supabase に置換
- 服の登録 → `clothes` テーブルに INSERT
- カレンダー記録 → `outfits` テーブルに INSERT/SELECT
- ホームの「今日のコーデ」は実 clothes から組む

### 完了条件
- 服を登録 → クローゼットに表示 → AIコーデ提案が実データから動く
- カレンダー記録ができ、過去日付に着用履歴が残る

---

## Phase 3：友人マルチ写真登録（GiftWear由来）

### やること
- `FacePhotoPicker` コンポーネント移植
- `lib/image.ts` の品質判定移植
- `blobStore.ts` 移植（IndexedDB Blob ストア）
- `useBlobUrl` hook 移植
- `friends` テーブル作成（DDL は MIGRATION_INVENTORY.md 参照）
- `/friends/new` `/friends/[id]/edit` 画面作成

### 完了条件
- 友人を登録できる（写真は IndexedDB、メタは Supabase）
- マルチ枚アップ + 品質バッジ動作
- 「自分」も友人として登録可能（`is_me=true`）

---

## Phase 4：AI 試着 API（IDM-VTON）

### やること
- `app/api/tryon/route.ts` 移植
- `tryons` テーブル作成
- `/tryon/[friendId]` 画面作成
- 試着結果を Supabase Storage に保存（顔写真原本は端末内のまま）
- 試着履歴画面

### 完了条件
- 友人と服を選んで試着 → 結果画像が表示される
- 試着履歴が Supabase に残る

---

## Phase 5：LoRA 訓練 + 推論（本人モード）

### やること
- 「本人モード作成」ボタン（友人プロフィールに）
- 端末内の顔写真を Replicate に送信 → `flux-dev-lora-trainer` で訓練
- 訓練進捗ポーリング + 完了通知
- 訓練済み LoRA URL を `friends.lora_url` に保存
- 試着 API を `flux-dev-lora` + LoRA で生成するよう切替（オプション選択式）
- クォータ：1人1回まで（追加は将来課金）

### 完了条件
- 本人モードで試着すると、明らかに「本人」度が上がる
- LoRA 状態が pending / training / ready で UI に出る

---

## Phase 6：天気・TPO・予定・嗜好 統合 AI コーデ提案

### やること
- Gemini プロンプトを拡張：
  - 気温に応じた**中身レイヤー**提案
  - 予定タイトルから TPO 自動推測
  - 過去履歴（同じ人と会う時の被り回避）
- 予定入力 UI（簡易：日付 + タイトル + 会う人）
- 「今日のコーデ」を予定とリンク

### 完了条件
- 「明日 19:00 鈴木さんとイタリアン」と入れたら、きれいめ・前回鈴木さんと会った時と違うコーデが提案される
- 寒い日はヒートテック等を含めた多層提案が出る

---

## Phase 7：被り回避 AI（カレンダー連動）

### やること
- `outfits` に `met_with_friends UUID[]` を追加
- コーデ記録時に「誰と会ったか」（任意入力 + 予定タイトル自動推測）
- 提案時：同じ人と次会う時、過去 3 回分は除外

### 完了条件
- カレンダー画面に「誰と」「何を着たか」両方表示
- 提案ロジックが過去履歴を見て被りを避ける

---

## Phase 8：Tinder式好み学習

### やること
- 服画像をスワイプする UI（右=好き、左=嫌い）
- 楽天検索結果 or 既存クローゼットを流す
- スワイプ履歴を `style_preferences` テーブルに保存
- 系統推定（地雷系 / ゴスロリ / きれいめ等）：Gemini で分類
- コーデ提案に嗜好をフィード

### 完了条件
- 50 swipe 後、明らかに好み寄りの提案が出る

---

## Phase 9：360° VR 試着

### やること
- `app/api/turntable/route.ts` 新規（`stability-ai/sv3d`）
- `TurntableViewer` コンポーネント：横スワイプで角度seek、ピンチで拡縮
- 試着結果画面に「360° で見る」ボタン
- 生成動画を Supabase Storage に保存

### 完了条件
- 試着結果から 360° モードに入り、指で全角度回せる

---

## Phase 10：旧 GiftWear リポ閉鎖

### やること
- giftwear リポの README に「StyleMate に統合されました」の案内追記
- Vercel デプロイ停止
- GitHub リポを archive 化
- ドメイン（あれば）を StyleMate に向ける

### 完了条件
- giftwear リポが archive 状態
- Vercel の旧プロジェクトが pause

---

## 共通ルール

### Phase の進め方
- 各 Phase 完了時に **git commit + Vercel deploy + 動作確認**
- 動作確認後に次 Phase に進む
- 「ここまで動いた」を1ワード言ってもらえれば次 Phase 着手

### Phase 中の中断・切り替え
- 急ぎ要件が来たら Phase 中でも中断可
- 中断したら CLAUDE.md の「進行中タスク」セクションを更新して再開可能に

### 失敗時の戻し
- 各 Phase は独立 commit にして、必要なら revert で戻せる
- DB migration は `supabase/migrations/` に番号付きで配置（後で）
