# StyleMate 引き継ぎガイド

新しいチャット・新しいセッション・別の人が開いた時に
**「このプロジェクトは今どうなってる？」**を **30秒で把握**するための入口ファイル。

最終更新：2026-06-09

---

## ⚡ 30秒サマリー

- **何**：AI ファッションコーデ × 本人試着の統合アプリ（StyleMate＝仮名）
- **由来**：自作 GiftWear（試着）+ 友人作 tomson（コーデ提案）を統合
- **現状**：**Phase 8 + 大幅UX改修 + コスト管理基盤まで完了、本番稼働中。UX磨き＋公開準備フェーズ**
- **本番URL**：https://stylemate-alpha.vercel.app
- **最新コミット**：`87834a4`（検索カードのタップ感UP）
- **次の候補**：マイページ整理 / オンボーディング / 利用規約 / Phase 5 (LoRA本人モード)
- **開発者**：kakechanapi（一人開発、Claude Code でペアプロ）

---

## 📚 これを順番に読めば全部わかる

| 順 | ファイル | 何が書いてある |
|---|---|---|
| 1 | このファイル（HANDOVER.md） | 全体把握の入口 ⭐ |
| 2 | `CLAUDE.md` | プロジェクト全体像・ビジョン・ロードマップ |
| 3 | `.secretary/CLAUDE.md` | 秘書ダッシュボードの使い方 |
| 4 | `.secretary/projects/stylemate-phases.md` | Phase ごとの最新進捗 |
| 5 | `app/status/page.tsx` | 開発状況ダッシュボード（公開、最新の機能一覧が見える） |
| 6 | `MIGRATION_PLAN.md` | 各 Phase の詳細手順 |
| 7 | `MIGRATION_INVENTORY.md` | GiftWear から移植したもの一覧 |

---

## ✅ 完了済みのもの

### コア機能
- ✅ Supabase Auth（**Google OAuth + メールマジックリンク**）
- ✅ クローゼット：登録・編集・削除・画像アップロード（楽天/Yahoo検索 or 手動）
- ✅ **服登録の自動判定**：商品名から カテゴリ・カラー・TPO・シーズン を推測（Gemini不使用・無料）
- ✅ 友人（試着対象 + 会う相手）：マルチ写真選択・自動品質フィルタ
- ✅ **友人まわり大改修**：クイック追加・編集ページ・性別/誕生日/関係性/写真/メモ
- ✅ AI 試着（IDM-VTON）：友人写真 + 服画像 → 試着結果
- ✅ AI コーデ提案（Gemini）：天気・TPO・予定・嗜好・性別・体型・身長 考慮
- ✅ **AI コーデ提案の刷新**：画像コラージュ表示・固定/却下ボタン・差し替え再提案・「今日の服に決定」→outfits自動保存・localStorage永続化
- ✅ 天気（**Open-Meteo** APIキー不要）：位置情報 or 東京デフォルト・体感温度・服装指数（0-100, 5段階）
- ✅ 予定登録：日付・時刻・TPO・誰と会う
- ✅ 着用記録：服 + 誰と + メモ
- ✅ 被り回避 AI：同じ人と最近着た服を避けて提案
- ✅ 嗜好スワイプ（Tinder式 drag）：服画像をスワイプ → Gemini が系統推定

### UX
- ✅ ログイン：Google / メール（エラー視認性UP）
- ✅ ナビ：4タブ（ホーム / クローゼット / カレンダー / マイ）
- ✅ クローゼット・予定：長押し → アクションシート（編集 / 削除）
- ✅ 着用記録：タップで編集ページ
- ✅ 友人タブ廃止 → マイページに自分プロフィール統合
- ✅ カレンダー：**iOS式 3ヶ月ストリップ**（指でめくれる、ページング）
- ✅ Loading スケルトン：全主要タブ
- ✅ 速度：並列クエリ、月範囲限定（カレンダー±1ヶ月）
- ✅ **友達リストカードのリッチ化**：性別アイコン・関係性バッジ・誕生日・最終会った日（相対）・会った回数・前回着た服のサムネ・メモプレビュー
- ✅ **検索カードのタップ感UP**：button要素化 + hover/active アニメ + 「選択 →」CTAピル + フォーカスリング

### マルチソース商品検索（基盤完成・API繋ぎ込み待ち）
- ✅ 楽天/Yahoo/Demo の並列実行・重複排除・スコアソート
- ✅ 本番 demo フォールバック完全無効化（偽データ事故防止）
- ✅ ブランド・カテゴリエイリアス（ジーンズ↔デニム、ニット↔セーター 等）
- ✅ 画像URLの自前ストレージ永続化（外部消失リスク対策）
- ✅ 検索結果が demo の時の警告UI

### コスト管理（重要・新規）
- ✅ `api_usage_logs` テーブル（migration 0008）
- ✅ 使用ログ自動記録（試着 / LoRA / Gemini 4箇所）
- ✅ 月間上限管理（管理者 1500円 / 他 300円・個別上書可）
- ✅ 上限超過時 試着/LoRA 自動ブロック（HTTP 429）
- ✅ ユーザー警告バナー（80%黄色 / 100%赤）
- ✅ **`/admin/costs` ダッシュボード**（30秒オートリフレッシュ・今日/今月/サービス別/Top10/30日トレンド）
- ⏳ Replicate Webhook で実コスト校正（VoC段階では推定値で十分）

### 整合性・信頼性
- ✅ 服削除時の outfits 整合性自動維持（cloth_ids から UUID 自動除去・空コーデは削除）
- ✅ 認証エラー対策：全 server action で session_expired 検出 → layout 常駐モーダルで再ログイン誘導
- ✅ Gemini 503 自動リトライ（1s→2s→4s）+ フォールバックモデル

### インフラ
- ✅ Vercel 本番デプロイ稼働中（git push で自動反映）
- ✅ Supabase（migrations 0001〜0008 全実行済）
- ✅ Storage バケット 3つ（clothing-images / tryon-results / lora-training）
- ✅ 公開ダッシュボード `/status`（認証不要・テスター共有用）

---

## 🚀 残作業

### 機能系
| Phase | 内容 | コスト | 状態 |
|---|---|---|---|
| **5** | LoRA 本人モード（5-4 訓練実走 → 5-5 2段階パイプ） | 訓練$2/人 + 推論$0.10/回 | 一部完了（5-3.5 まで） |
| **9** | 360° VR 試着（PoC） | ~$0.12/回 | 未着手 |
| **10** | 旧 giftwear リポ閉鎖 | 0円 | 未着手 |

### 公開準備
- ⏳ **利用規約・プライバシーポリシー**（マイページに「準備中」表示）
- ⏳ **アプリ名確定**（"StyleMate" は仮、友達と相談予定）
- ⏳ **楽天 API キー**：認証方式調査中（下記）
- ⏳ **Yahoo!ショッピング APP ID**：制限解除待ち（下記）
- ⏳ **オンボーディング画面**（初回ユーザーガイド）

### UX磨き候補（次のセッションで進める想定）
- マイページの整理（自分プロフィール表示が薄い）
- ホーム画面の情報密度調整
- 着用記録履歴の見せ方

---

## 🟡 進行中／待ち

### 楽天API：✅ 本番稼働中（2026-06-13 解決）
- 新仕様（2026-04-01）に対応完了
- エンドポイント：`https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401`
- 認証：`applicationId`（UUID形式）+ `accessKey`（pk_...）両方をクエリで指定
- 環境変数：`RAKUTEN_APPLICATION_ID` + `RAKUTEN_ACCESS_KEY` を Production/Development に追加済
  - Preview 環境への CLI 追加が詰まる → ダッシュボードで後追加：
    https://vercel.com/kakechanapis-projects/stylemate/settings/environment-variables
- 検証スクリプト：`npm run test:product-search ニット` で動作確認可

### Yahoo!ショッピングAPI：新規ID制限解除待ち
- 新規Yahoo!ID作成済だが、`https://e.developer.yahoo.co.jp/dashboard/create` でエラーE700701（anti-fraud throttling）
- 24-72時間ルール、ユーザー側で時間置いて再試行予定
- 解除後、API取得 → `YAHOO_SHOPPING_APP_ID=...` を `.env.local` と Vercel に追加すれば即動作（コード完成済）

### Phase 5 LoRA本人モード（優先度低下）
- 5-3.5 まで完了。5-4 訓練実走 → 5-5 2段階パイプ実装が残
- VoC予算：自分 1,000円のみ（親友分カット）
- 訓練前に Replicate Webhook 実コスト校正を入れた方が安心（todo）

---

## 🔑 大事なアカウント・URL

| | |
|---|---|
| GitHub | https://github.com/kakechanapi/stylemate （Public） |
| 本番デプロイ | https://stylemate-alpha.vercel.app |
| 公開ダッシュボード | https://stylemate-alpha.vercel.app/status |
| 管理者コスト | https://stylemate-alpha.vercel.app/admin/costs |
| Supabase | https://supabase.com/dashboard/project/rsuykemaxgxhbsogrgln |
| 旧 GiftWear（参照のみ） | `/Users/kakeru.hamamura/FX/giftwear/` |
| Vercel CLI ユーザー | kakechanapi（ログイン済） |

---

## 📧 連絡先メール

- **`kakeruha0602@gmail.com`** ← サービス登録・Google OAuth・テスト・管理者
- ※ `kakeru.hamamura@ebisol.co.jp` は仕事用なので**使わない**

---

## 🛠 環境

- **macOS**
- **Editor**: Claude Code（ターミナル統合）
- **ローカル起動**: `cd /Users/kakeru.hamamura/FX/stylemate && npm run dev`

### `.env.local`（git管理外）に設定済
- ✅ NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY
- ✅ REPLICATE_API_TOKEN
- ✅ NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID
- ✅ GEMINI_API_KEY
- ✅ RAKUTEN_ACCESS_KEY（動作未確認・認証仕様調査中）
- ✅ ADMIN_EMAILS=kakeruha0602@gmail.com
- ✅ MOCK_TRYON=false

### Vercel 環境変数
- ✅ 上記すべて + ADMIN_EMAILS を 3環境（Production/Preview/Development）に追加済

### 未設定（連携でき次第追加）
- ⏳ YAHOO_SHOPPING_APP_ID（Yahoo!ID制限解除後）

---

## 🗃 Supabase スキーマ（実行済の前提）

すべて以下の SQL を Supabase で実行済：
1. `supabase/schema.sql` （profiles, clothes, outfits）
2. `supabase/migrations/0001_friends.sql` （friends）
3. `supabase/migrations/0002_tryons.sql` （tryons + Storage）
4. `supabase/migrations/0003_events_and_metwith.sql` （events + outfits.met_with）
5. `supabase/migrations/0004_clothing_images_bucket.sql` （Storage）
6. `supabase/migrations/0005_style_preferences.sql` （嗜好）
7. `supabase/migrations/0006_lora_training.sql` （LoRA訓練 + Storage `lora-training`）
8. `supabase/migrations/0007_friend_note.sql` （friends.note）
9. `supabase/migrations/0008_cost_tracking.sql` （api_usage_logs + profiles拡張）

未実行があればユーザーに確認してから流す。

---

## 🎯 ユーザーから合意済みの方針（変更禁止）

| 論点 | 決定 |
|---|---|
| 顔写真の本人そっくり化 | LoRA 訓練必須（Phase 5） |
| 顔写真の保存場所 | 端末内 IndexedDB（プライバシー） |
| LoRA訓練時の送信 | Replicate へ送信 → 訓練後削除 |
| 認証方式 | Google OAuth + メールマジックリンク |
| アプリ名 | StyleMate（仮、変わる可能性） |
| 旧 GiftWear ダンス機能 | 移植しない |
| ストレージ | Supabase 一元化（顔写真除く） |
| 開発者 | kakechanapi 単独（友人は手を離す） |
| 「自分」と「会う相手」 | マイページに自分、/friends に会う相手 |
| **友達は身長/体型/LoRA/試着 対象外** | スコープ確定（2026-06-06）。LoRA は自分のみ |
| **VoC予算** | 自分 1,000円のみ（親友分カット） |
| **本番でのdemoフォールバック** | 完全無効化（偽データ事故防止） |

---

## 🚫 やらないこと（合意済）

- 顔写真をサーバーに永続保存しない
- 「本人っぽいアバター」路線への妥協（Doji 方式 NG）
- ダンス動画機能の移植
- 共通認証システム
- 本番で demo データを表示（手動 demo モードのみ）

---

## 💡 開発スタイル

- **ユーザーは時短重視**。Q&A は最小限、判断できるものは自動で進める
- **Phase 単位で commit + push**（細かい WIP 重視）
- **コミットメッセージは日本語OK**
- 「これは大きい変更だから」と感じたら**事前確認**する
- ユーザーは**新しい AI のサポートを並行で受けている**（疑問は別経路でも解消する）
- **コード解説は不要**（聞かれた時だけ）

### ⚠️ 先回りして問題点を共有するルール（2026-06-06 追加）
「言われたことだけやる」ではなく、**ユーザーが気付いていなさそうな問題・改善点を能動的に提案**する。
- 実装中に「これも修正が必要かも」と気付いたら、**今のタスクと別件でも明示的に報告**
- リリースブロッカー級（コスト爆発・セキュリティ・データ不整合・法的リスク）は最優先で警告
- UX 改善や設計改善は遠慮なく提案、優先度（🔴 必須 / 🟡 推奨 / 🟢 将来）付き
- 単なる感想ではなく、**具体的なファイル・挙動・代替案**を伴うこと

### Server-only と Client の分離（2026-06-07 追加）
クライアントコンポーネントから import するファイルは Server-only API（next/headers 等）に到達してはダメ。新規ファイル追加時は意識：
- 純粋型/定数 → `*-constants.ts` or `*-shared.ts`（例：`lib/usage-cost-constants.ts`、`lib/admin-costs-shared.ts`）
- supabase/server を使う → 本体ファイル

---

## 📞 困ったら / 確認系

ユーザーに以下を確認：
- 「Supabase の Site URL / Redirect URLs は最新？」
  - Site URL: `https://stylemate-alpha.vercel.app`
  - Redirect URLs: `https://stylemate-alpha.vercel.app/auth/callback`, `https://stylemate-alpha.vercel.app/**`, `http://localhost:3000/auth/callback`, `http://localhost:3000/**`
- 「Google OAuth は Supabase で有効になってる？」（kakechanapi の Google Cloud Console で OAuth client 作成済）
- 「全 SQL マイグレーション流したか？」（0001〜0008）
- 「ADMIN_EMAILS は Vercel 3環境に入ってる？」

---

## 📂 ディレクトリ最新構成

```
app/
├── admin/
│   └── costs/           コスト管理ダッシュボード（30秒オートリフレッシュ）
├── api/
│   ├── ai-outfit/       Gemini コーデ提案
│   ├── lora-train/      LoRA 訓練（POST=開始 / GET=ポーリング）
│   ├── products/search  楽天/Yahoo/Demo マルチソース検索
│   ├── style-feed       スワイプ用フィード
│   ├── tryon            IDM-VTON 試着
│   └── weather          Open-Meteo
├── auth/                認証コールバック
├── calendar/            旧カレンダー（残置・基本未使用）
├── closet/              クローゼット + 編集
│   └── [id]/edit/       服の編集
├── events/              新カレンダー（予定 + 着用記録）+ 編集
├── friends/             会う相手 + 編集（自分は ?me=1）
├── login/               ログイン（Google + magic link）
├── my/                  マイ（自分プロフィール + 嗜好カード + LoRA状態）
├── outfits/new + [id]/edit  着用記録の作成・編集
├── register/            服を登録（マルチソース検索 + 手動 + 画像アップロード）
├── status/              開発状況ダッシュボード（公開・認証不要）
├── style/               嗜好スワイプ（Tinder式）
└── tryon/[friendId]/    試着

src/
├── components/          UI コンポーネント（FriendCard, NewOutfitForm, LoraTrainingFlow 等）
├── lib/
│   ├── product-search/  マルチソース商品検索（rakuten/yahoo/demo + rank）
│   ├── usage-cost-constants.ts  コスト定数（Server/Client共有）
│   ├── admin-costs-shared.ts    管理者ダッシュボード共有型
│   └── ...
└── types/               型定義

supabase/
├── schema.sql
└── migrations/0001〜0008
```

---

## 🆘 新セッションで Claude が最初にやること

1. このファイル（HANDOVER.md）を読む
2. `CLAUDE.md` を読む（ビジョン把握）
3. `.secretary/projects/stylemate-phases.md` を読む（最新の進捗詳細）
4. `app/status/page.tsx` を読む（機能一覧の最新スナップショット）
5. ユーザーに「**何から進めますか？**」と聞く

---

## ✅ ライセンス・公開状況

- リポ：**Public**（誰でも閲覧可）
- API キー類は `.env.local` のみ → git に出ていない
- `.secretary/` は gitignore（ローカルのみ）
- `/status` は認証不要で公開（テスター共有用）
- `/admin/costs` は ADMIN_EMAILS 一致 or profiles.is_admin=true のユーザーのみ
