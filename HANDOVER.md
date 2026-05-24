# StyleMate 引き継ぎガイド

新しいチャット・新しいセッション・別の人が開いた時に
**「このプロジェクトは今どうなってる？」**を **30秒で把握**するための入口ファイル。

最終更新：2026-05-24

---

## ⚡ 30秒サマリー

- **何**：AI ファッションコーデ × 本人試着の統合アプリ（StyleMate＝仮名）
- **由来**：自作 GiftWear（試着）+ 友人作 tomson（コーデ提案）を統合
- **現状**：**Phase 8 + UX改修まで完了、本番稼働中**
- **本番URL**：https://stylemate-alpha.vercel.app
- **次の候補**：動作再確認 / Phase 5 (LoRA本人モード) / 利用規約整備 / Phase 9 (360° VR)
- **開発者**：kakechanapi（一人開発、Claude Code でペアプロ）

---

## 📚 これを順番に読めば全部わかる

| 順 | ファイル | 何が書いてある |
|---|---|---|
| 1 | このファイル（HANDOVER.md） | 全体把握の入口 ⭐ |
| 2 | `CLAUDE.md` | プロジェクト全体像・ビジョン・ロードマップ |
| 3 | `.secretary/CLAUDE.md` | 秘書ダッシュボードの使い方 |
| 4 | `.secretary/projects/stylemate-phases.md` | Phase ごとの最新進捗 |
| 5 | `MIGRATION_PLAN.md` | 各 Phase の詳細手順 |
| 6 | `MIGRATION_INVENTORY.md` | GiftWear から移植したもの一覧 |
| 7 | `.secretary/todos/2026-05-XX.md` | 直近のTODO |

---

## ✅ 完了済みのもの

### コア機能
- ✅ Supabase Auth（**Google OAuth + メールマジックリンク**）
- ✅ クローゼット：登録・編集・削除・画像アップロード（手動 or 楽天検索 demo data）
- ✅ 友人（試着対象 + 会う相手）：マルチ写真選択・自動品質フィルタ
- ✅ AI 試着（IDM-VTON）：友人写真 + 服画像 → 試着結果
- ✅ AI コーデ提案（Gemini）：天気・TPO・予定・嗜好考慮
- ✅ 天気（**Open-Meteo** APIキー不要）：位置情報 or 東京デフォルト
- ✅ 予定登録：日付・時刻・TPO・誰と会う
- ✅ 着用記録：服 + 誰と + メモ
- ✅ 被り回避 AI：同じ人と最近着た服を避けて提案
- ✅ 嗜好スワイプ（Tinder式 drag）：服画像をスワイプ → Gemini が系統推定（カラー・パターン・シルエット込み）

### UX
- ✅ ログイン：Google / メール
- ✅ ナビ：4タブ（ホーム / クローゼット / カレンダー / マイ）
- ✅ クローゼット・予定：長押し → アクションシート（編集 / 削除）
- ✅ 着用記録：タップで編集ページ（詳細閲覧 + 編集）
- ✅ 友人タブ廃止 → マイページに自分プロフィール統合
- ✅ カレンダー：**iOS式 3ヶ月ストリップ**（指でめくれる、ページング）
- ✅ Loading スケルトン：全主要タブ
- ✅ 速度：並列クエリ、月範囲限定（カレンダー±1ヶ月）

### インフラ
- ✅ Vercel 本番デプロイ稼働中
- ✅ Supabase（5つのマイグレーション実行済の前提）
- ✅ Storage バケット 2つ（clothing-images / tryon-results）
- ✅ 旧 tomson 残骸（predictions docs）削除済

---

## 🚀 残作業

### 機能系
| Phase | 内容 | コスト | 状態 |
|---|---|---|---|
| **5** | LoRA 本人モード（試着の質UP・コアバリュー） | ~$2-3/友人 | 未着手 |
| **9** | 360° VR 試着（PoC） | ~$0.12/回 | 未着手 |
| **10** | 旧 giftwear リポ閉鎖 | 0円 | 未着手 |

### 公開準備
- ⏳ **利用規約・プライバシーポリシー** （マイページに「準備中」表示）
- ⏳ **アプリ名確定**（"StyleMate" は仮、友達と相談予定）
- ⏳ **楽天 API キー**（アプリ名確定後）
- ⏳ **オンボーディング画面**（初回ユーザーガイド）

### UX改善のタネ
- コーデ提案を「お気に入り」保存
- 服の着用履歴（このシャツを何回着たか）
- 天気予報7日分
- シェア機能

---

## 🔑 大事なアカウント・URL

| | |
|---|---|
| GitHub | https://github.com/kakechanapi/stylemate （Public） |
| 本番デプロイ | https://stylemate-alpha.vercel.app |
| Supabase | https://supabase.com/dashboard/project/rsuykemaxgxhbsogrgln |
| 旧 GiftWear（参照のみ） | `/Users/kakeru.hamamura/FX/giftwear/` |
| Vercel CLI ユーザー | kakechanapi（ログイン済） |

---

## 📧 連絡先メール

- **`kakeruha0602@gmail.com`** ← サービス登録・Google OAuth・テストはこちら
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
- ✅ MOCK_TRYON=false

### 未設定（Phase 進行で追加）
- ⏳ RAKUTEN_ACCESS_KEY（商品検索 API・アプリ名確定後）

---

## 🗃 Supabase スキーマ（実行済の前提）

すべて以下の SQL を Supabase で実行済：
1. `supabase/schema.sql` （profiles, clothes, outfits）
2. `supabase/migrations/0001_friends.sql` （friends）
3. `supabase/migrations/0002_tryons.sql` （tryons + Storage）
4. `supabase/migrations/0003_events_and_metwith.sql` （events + outfits.met_with）
5. `supabase/migrations/0004_clothing_images_bucket.sql` （Storage）
6. `supabase/migrations/0005_style_preferences.sql` （嗜好）

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

---

## 🚫 やらないこと（合意済）

- 顔写真をサーバーに永続保存しない
- 「本人っぽいアバター」路線への妥協（Doji 方式 NG）
- ダンス動画機能の移植
- 共通認証システム

---

## 💡 開発スタイル

- **ユーザーは時短重視**。Q&A は最小限、判断できるものは自動で進める
- **Phase 単位で commit + push**（細かい WIP 重視）
- **コミットメッセージは日本語OK**
- 「これは大きい変更だから」と感じたら**事前確認**する
- ユーザーは**新しい AI のサポートを並行で受けている**（疑問は別経路でも解消する）
- **コード解説は不要**（聞かれた時だけ）

---

## 📞 困ったら / 確認系

ユーザーに以下を確認：
- 「Supabase の Site URL / Redirect URLs は最新？」
  - Site URL: `https://stylemate-alpha.vercel.app`
  - Redirect URLs: `https://stylemate-alpha.vercel.app/auth/callback`, `https://stylemate-alpha.vercel.app/**`, `http://localhost:3000/auth/callback`, `http://localhost:3000/**`
- 「Google OAuth は Supabase で有効になってる？」（kakechanapi の Google Cloud Console で OAuth client 作成済）
- 「全 SQL マイグレーション流したか？」
- 「PAT は古い `ghp_bw0H...` のままか？」（必要なら新規発行推奨）

---

## 📂 ディレクトリ最新構成

```
app/
├── api/
│   ├── ai-outfit/       Gemini コーデ提案
│   ├── products/search  楽天検索（demo data fallback）
│   ├── style-feed       スワイプ用フィード
│   ├── tryon            IDM-VTON 試着
│   └── weather          Open-Meteo
├── auth/                認証コールバック
├── calendar/            旧カレンダー（残置・基本未使用）
├── closet/              クローゼット + 編集
├── events/              新カレンダー（予定 + 着用記録）+ 編集
├── friends/             会う相手 + 編集（自分は ?me=1）
├── login/               ログイン（Google + magic link）
├── my/                  マイ
├── outfits/new + [id]/edit  着用記録の作成・編集
├── register/            服を登録（楽天検索 + 手動 + 画像アップロード）
├── style/               嗜好スワイプ（Tinder式）
└── tryon/[friendId]/    試着

src/
├── components/          UI コンポーネント
├── lib/                 Supabase クライアント・各種ロジック
└── types/               型定義

supabase/
├── schema.sql
└── migrations/0001〜0005
```

---

## 🆘 新セッションで Claude が最初にやること

1. このファイル（HANDOVER.md）を読む
2. `CLAUDE.md` を読む（ビジョン把握）
3. `.secretary/projects/stylemate-phases.md` を読む（最新の進捗詳細）
4. ユーザーに「**何から進めますか？**」と聞く

---

## ✅ ライセンス・公開状況

- リポ：**Public**（誰でも閲覧可）
- API キー類は `.env.local` のみ → git に出ていない
- `.secretary/` は gitignore（ローカルのみ）
