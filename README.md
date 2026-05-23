# StyleMate（仮）

> AI ファッションコーデ × 本人試着の統合アプリ

天気・予定・あなたの好みに合わせて、AI が**所有服**から最適コーデを提案。
新しい服が必要なら**本人モード（顔写真複数枚で訓練した LoRA）**で試着し、
そのまま EC へ。

## 由来
自作 **GiftWear**（AI 試着）と 友人作 **tomson**（クローゼット管理 + 天気/TPO コーデ提案）を**完全統合**したアプリ。

詳細は `CLAUDE.md` / `HANDOVER.md` 参照。

---

## 技術スタック
- **Next.js 16** (App Router) + **React 19** + **Tailwind 4**
- **Supabase**（PostgreSQL + Auth + Realtime + Storage）
- **Google Gemini**（コーデ提案AI）
- **Replicate**（AI 試着・LoRA訓練・360° VR）
- **Open-Meteo**（天気・API キー不要）
- **楽天市場 API**（商品検索 / アフィリエイト）
- **Vercel**（ホスティング）

---

## ローカル開発

```bash
# 依存インストール
npm install

# 開発サーバー
npm run dev   # http://localhost:3000

# 本番ビルド確認
npm run build
```

---

## 環境変数（`.env.local`）

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# AI / 推論
REPLICATE_API_TOKEN=...
GEMINI_API_KEY=...

# 楽天
RAKUTEN_ACCESS_KEY=...                    # 商品検索（任意・無いと demo data）
NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID=...      # アフィリエイト追跡

# 任意
MOCK_TRYON=false
```

> 💡 **天気は Open-Meteo を使用**（API キー不要）

---

## Supabase セットアップ

1. [supabase.com](https://supabase.com) でプロジェクト作成
2. SQL Editor で以下を順番に実行：
   - `supabase/schema.sql`
   - `supabase/migrations/0001_friends.sql`
   - `supabase/migrations/0002_tryons.sql`
   - `supabase/migrations/0003_events_and_metwith.sql`
3. **Authentication → URL Configuration**：
   - Site URL: 本番 URL
   - Redirect URLs: `<本番URL>/auth/callback`, `<本番URL>/**`, `http://localhost:3000/auth/callback`, `http://localhost:3000/**`
4. **Authentication → Providers**：Google 等を有効化

---

## デプロイ

```bash
vercel --prod --yes
```

---

## ドキュメント

- `CLAUDE.md` — プロジェクト全体像（新しい Claude セッションが最初に読む）
- `HANDOVER.md` — 30秒で全部把握できる入口
- `MIGRATION_PLAN.md` — Phase ごとの詳細手順
- `MIGRATION_INVENTORY.md` — GiftWear からの移植リスト

---

## ライセンス

私的開発中。リリース時に決定予定。
