# 予測市場アプリ
> 「賭けじゃなくて、考える習慣」

日本向け予測市場 Web アプリ（Next.js + Supabase）

## セットアップ

```bash
cp .env.example .env.local
# .env.local に Supabase の URL・キーを設定

npm install
npm run dev
# → http://localhost:3000
```

## Supabase セットアップ

1. [supabase.com](https://supabase.com) でプロジェクト作成
2. `supabase/schema.sql` を SQL Editor で実行
3. `.env.local` に URL と anon key を設定

## スクリプト

```bash
# AI質問を自動生成（politics/economy/sports/entertainment/society/tech）
ANTHROPIC_API_KEY=your-key node scripts/generate-questions.js --category politics --count 5

# 確認のみ（DBに保存しない）
node scripts/generate-questions.js --category sports --dry-run
```

## 画面構成

| パス | 画面 |
|------|------|
| `/` | ホーム（予測一覧・カテゴリフィルター） |
| `/predictions/[id]` | 予測詳細・投票 |

## ドキュメント
- [設計書](docs/design.md)
- [戦略レビュー](docs/strategy-review.md)
- [DBスキーマ](supabase/schema.sql)

## 技術スタック
- **フロントエンド**: Next.js 15 (App Router)
- **バックエンド/DB**: Supabase (PostgreSQL + Realtime)
- **AI質問生成**: Anthropic Claude Haiku
- **デプロイ**: Vercel
