# StyleMate 引き継ぎガイド

新しいチャット・新しいセッション・別の人が開いた時に
**「このプロジェクトは今どうなってる？」**を **30秒で把握**するための入口ファイル。

---

## ⚡ 30秒サマリー

- **何**：AI ファッションコーデ × 本人試着の統合アプリ
- **由来**：自作 GiftWear + 友人作 tomson を統合
- **現状**：**Phase 4 完了 + Vercel 本番 + Google ログイン動作中**
- **次**：Phase 5（LoRA 本人モード）or 動作確認 or Phase 6
- **開発者**：kakechanapi（一人開発、Claude Code でペアプロ）
- **本番URL**：https://stylemate-alpha.vercel.app

---

## 📚 これを順番に読めば全部わかる

| 順 | ファイル | 何が書いてある |
|---|---|---|
| 1 | `CLAUDE.md` | プロジェクト全体像・ビジョン・ロードマップ |
| 2 | `.secretary/CLAUDE.md` | 秘書ダッシュボードの使い方 |
| 3 | `.secretary/projects/stylemate-phases.md` | Phase 進捗（最重要・最新状況） |
| 4 | `MIGRATION_PLAN.md` | Phase ごとの詳細手順 |
| 5 | `MIGRATION_INVENTORY.md` | GiftWear から移植するもの一覧 |
| 6 | `.secretary/todos/YYYY-MM-DD.md` | 今日のTODO |

---

## 🔑 大事なアカウント・URL

| | |
|---|---|
| GitHub | https://github.com/kakechanapi/stylemate |
| 本番デプロイ | https://stylemate-alpha.vercel.app |
| Supabase | https://supabase.com/dashboard/project/rsuykemaxgxhbsogrgln |
| 旧 GiftWear（参照のみ） | `/Users/kakeru.hamamura/FX/giftwear/` |

## 📧 ユーザーメインメールアドレス

- **`kakeruha0602@gmail.com`** ← サービス登録・連絡先はこちらを使う
- ※ `kakeru.hamamura@ebisol.co.jp` は仕事用なので**使わない**

---

## 🛠 環境

- **OS**: macOS
- **Editor**: Claude Code（ターミナル統合）
- **Node**: 確認は `node -v`
- **ローカル起動**: `cd /Users/kakeru.hamamura/FX/stylemate && npm run dev`

### 設定済の API キー（`.env.local` 内）
- ✅ Supabase URL / anon key / service_role key
- ✅ Replicate API トークン
- ✅ 楽天アフィリエイト ID

### 未設定（Phase 進行中に追加）
- ⏳ OpenWeather API キー（Phase 6 で必要）
- ⏳ Gemini API キー（Phase 6 で必要）
- ⏳ 楽天アクセスキー（Phase 2 商品検索を使うなら必要）

---

## 🎯 ユーザーから合意済みの方針

| 論点 | 決定 |
|---|---|
| 顔写真の本人そっくり化 | LoRA 訓練必須（Phase 5） |
| 顔写真の保存場所 | 端末内 IndexedDB（プライバシー） |
| LoRA訓練時の送信 | Replicate へ送信 → 訓練後削除 |
| 認証方式 | メールマジックリンク（Phase 1 完了） |
| アプリ名 | StyleMate（仮、変わる可能性） |
| 旧 GiftWear ダンス機能 | 移植しない（コードはアーカイブ） |
| ストレージ | Supabase 一元化（顔写真除く） |
| 開発者 | kakechanapi 単独（友人は手を離す） |

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
- **新しいチャット**を開く時はこの `HANDOVER.md` だけ最初に開けば全部わかる構造

---

## 📞 困ったら

ユーザーに以下を確認：
- 「Supabase の Site URL は設定済？」（Phase 1 のログイン疎通用）
- 「PAT は新しくしました？」（ghp_bw0H... を破棄して新規発行推奨）
- 「Vercel デプロイ進めますか？」
