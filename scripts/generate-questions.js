#!/usr/bin/env node
/**
 * 予測市場 — AI質問自動生成スクリプト
 *
 * 使い方:
 *   ANTHROPIC_API_KEY=your-key node scripts/generate-questions.js
 *   node scripts/generate-questions.js --category politics --count 5
 *
 * オプション:
 *   --category  カテゴリ（politics/economy/sports/entertainment/society/tech）
 *   --count     生成する質問数（デフォルト: 5）
 *   --dry-run   DBへの保存をスキップして標準出力のみ
 */

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()  // ANTHROPIC_API_KEY 環境変数を自動で読む

// =============================================
// カテゴリ別プロンプトテンプレート
// =============================================
const CATEGORY_PROMPTS = {
  politics: `
日本の政治・選挙・政策に関する予測質問を生成してください。
- 衆議院・参議院選挙、内閣支持率、法案通過
- 具体的な期間（例: 2026年末まで）を設定できる質問
- 政党の動向、首相・大臣の去就
`,
  economy: `
日本・世界の経済・金融市場に関する予測質問を生成してください。
- 日経平均、為替（ドル円）、金利
- GDP成長率、インフレ率
- 企業の業績、M&A、上場
`,
  sports: `
スポーツの試合結果・成績に関する予測質問を生成してください。
- プロ野球（NPB）、Jリーグ、相撲
- 日本代表の試合結果
- オリンピック・世界選手権の成績
`,
  entertainment: `
エンタメ・芸能・文化に関する予測質問を生成してください。
- 映画興行収入、アニメの人気
- アーティストの活動（ライブ、アルバム）
- 賞レース（日本アカデミー賞など）
`,
  society: `
日本社会・生活・トレンドに関する予測質問を生成してください。
- 人口動態、少子化対策
- 気候・天気の傾向
- テクノロジー普及（EV、AI、キャッシュレス）
`,
  tech: `
テクノロジー・IT業界に関する予測質問を生成してください。
- AI・大規模言語モデルの動向
- スタートアップの上場・資金調達
- サービスのリリース・終了
`,
}

// =============================================
// 質問生成関数
// =============================================
async function generateQuestions({ category = 'politics', count = 5 } = {}) {
  const today = new Date().toISOString().split('T')[0]
  const categoryPrompt = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.politics

  const systemPrompt = `あなたは予測市場の質問を生成する専門家です。

以下のルールを必ず守ってください：
1. 質問は必ず Yes / No で答えられる形式にする
2. 結果が客観的に判定できる質問のみ生成する（「〜の可能性が高い」などはNG）
3. 締切日（closes_at）は必ず未来の日付にする（今日: ${today}）
4. 政治的に中立な表現を使う
5. 日本語で生成する
6. 各質問に根拠となる情報源URLを添付する（実在するURLを推測。見つからない場合は null）`

  const userMessage = `${categoryPrompt}

上記のカテゴリで予測市場の質問を${count}個生成してください。

以下のJSONスキーマで回答してください:
{
  "questions": [
    {
      "question": "質問文（Yes/No形式）",
      "description": "質問の背景・文脈（2〜3文）",
      "category": "${category}",
      "closes_at": "ISO 8601形式の締切日時（例: 2026-12-31T23:59:59+09:00）",
      "source_url": "参考URL（なければ null）",
      "difficulty": "easy | medium | hard"
    }
  ]
}`

  console.log(`\n[${category.toUpperCase()}] ${count}問を生成中...\n`)

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5',  // 設計書の通り低コストモデルを使用
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  let fullText = ''
  process.stdout.write('生成中: ')

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      process.stdout.write('.')
      fullText += event.delta.text
    }
  }

  const finalMessage = await stream.finalMessage()
  console.log(` 完了（${finalMessage.usage.output_tokens} tokens）\n`)

  // JSONを抽出してパース
  const jsonMatch = fullText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('JSONが見つかりませんでした。レスポンス:\n' + fullText)
  }

  return JSON.parse(jsonMatch[0])
}

// =============================================
// 質問の品質チェック
// =============================================
function validateQuestion(q) {
  const errors = []

  if (!q.question || q.question.length < 10) {
    errors.push('質問文が短すぎます')
  }
  if (!q.question.includes('？') && !q.question.includes('?')) {
    errors.push('質問文に疑問符がありません')
  }
  if (!q.closes_at) {
    errors.push('締切日が設定されていません')
  } else {
    const closesAt = new Date(q.closes_at)
    if (closesAt <= new Date()) {
      errors.push('締切日が過去の日付です')
    }
  }
  if (!['politics', 'economy', 'sports', 'entertainment', 'society', 'tech'].includes(q.category)) {
    errors.push(`不正なカテゴリ: ${q.category}`)
  }

  return errors
}

// =============================================
// メイン処理
// =============================================
async function main() {
  // CLIオプション解析
  const args = process.argv.slice(2)
  const getArg = (name) => {
    const idx = args.indexOf(`--${name}`)
    return idx !== -1 ? args[idx + 1] : null
  }

  const category = getArg('category') || 'politics'
  const count = parseInt(getArg('count') || '5', 10)
  const dryRun = args.includes('--dry-run')

  if (!CATEGORY_PROMPTS[category]) {
    console.error(`不明なカテゴリ: ${category}`)
    console.error(`有効なカテゴリ: ${Object.keys(CATEGORY_PROMPTS).join(', ')}`)
    process.exit(1)
  }

  try {
    const result = await generateQuestions({ category, count })
    const questions = result.questions || []

    console.log(`=== 生成された質問 (${questions.length}件) ===\n`)

    const validQuestions = []
    const invalidQuestions = []

    for (const [i, q] of questions.entries()) {
      const errors = validateQuestion(q)
      if (errors.length > 0) {
        console.log(`[${i + 1}] ❌ 品質チェック失敗: ${errors.join(', ')}`)
        invalidQuestions.push(q)
      } else {
        console.log(`[${i + 1}] ✅ ${q.question}`)
        console.log(`    カテゴリ: ${q.category} | 難易度: ${q.difficulty}`)
        console.log(`    締切: ${q.closes_at}`)
        if (q.source_url) console.log(`    参考: ${q.source_url}`)
        console.log()
        validQuestions.push(q)
      }
    }

    console.log(`\n=== 結果サマリー ===`)
    console.log(`有効: ${validQuestions.length}件 / 無効: ${invalidQuestions.length}件`)

    if (dryRun) {
      console.log('\n[dry-run] DBへの保存をスキップしました')
      console.log('\nJSON出力:')
      console.log(JSON.stringify(validQuestions, null, 2))
    } else {
      console.log('\n次のステップ: これらの質問を人間がレビューしてからSupabaseに登録します')
      console.log('Supabase CLIで実行: supabase db query "INSERT INTO predictions ..."')
    }

    return validQuestions

  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.error('レートリミットに達しました。しばらく待ってから再試行してください')
    } else if (error instanceof Anthropic.AuthenticationError) {
      console.error('APIキーが無効です。ANTHROPIC_API_KEY を確認してください')
    } else if (error instanceof Anthropic.APIError) {
      console.error(`API エラー (${error.status}):`, error.message)
    } else {
      console.error('予期しないエラー:', error)
    }
    process.exit(1)
  }
}

main()
