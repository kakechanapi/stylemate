# 予測市場アプリ
> 「賭けじゃなくて、考える習慣」

日本向け予測市場モバイルアプリ（Expo + Supabase）

## セットアップ

```bash
cp .env.example .env
# .env にAPIキーを設定

npm install
npm start
```

## スクリプト

```bash
# AI質問を自動生成（politics/economy/sports/entertainment/society/tech）
node scripts/generate-questions.js --category politics --count 5

# 確認のみ（DBに保存しない）
node scripts/generate-questions.js --category sports --dry-run
```

## ドキュメント
- [設計書](docs/design.md)
- [戦略レビュー](docs/strategy-review.md)
- [DBスキーマ](supabase/schema.sql)

## 技術スタック
- **フロントエンド**: Expo (React Native)
- **バックエンド/DB**: Supabase (PostgreSQL + Realtime)
- **AI質問生成**: Anthropic Claude Haiku
- **認証**: Supabase Auth
