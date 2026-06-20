// 服の写真から自動で「名前・カテゴリ・色・TPO・シーズン」を判定する API
// クライアントから Base64 画像 + mimeType を受け取り、Gemini Vision に投げる。
//
// 用途：
// - クローゼット登録画面で「写真撮るだけで自動入力」を実現
// - 文字情報ゼロからでも分類できる（軽量フォールバック classifyClothing は商品名前提）
//
// レスポンス：登録画面のフィールドに直接プリフィルできる形

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { logUsage } from '@/lib/usage-cost'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const MODEL = 'gemini-flash-latest'

export interface ClassifyImageResponse {
  ok: boolean
  name?: string // 例：「白Tシャツ」「黒スキニーデニム」
  brand?: string // ブランドが見える場合（タグ等）
  category?: 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'bag' | 'accessory' | 'dress' | 'other'
  color?: string // 「ホワイト」「ブラック」「ネイビー」等
  tpoTags?: string[] // ['casual', 'work'] 等
  seasonTags?: string[] // ['spring', 'summer'] 等
  error?: string
}

const PROMPT = `あなたはファッション分類の専門家です。送られた1枚の服の写真を見て、以下を JSON で返してください。

【返答形式：必ず JSON のみ、前後に余計なテキスト不要】
{
  "name": "短い商品名（例：白Tシャツ / 黒スキニーデニム / ベージュトレンチコート / グレーのカーディガン）",
  "brand": "ブランドが写ってる場合のみ（UNIQLO/GU/ZARA 等）。判別不能なら空文字列",
  "category": "tops | bottoms | outerwear | shoes | bag | accessory | dress | other のいずれか",
  "color": "ホワイト / ブラック / グレー / ネイビー / ブルー / レッド / ピンク / グリーン / イエロー / ブラウン / ベージュ / パープル / オレンジ / ボルドー のいずれか（最も近いもの）",
  "tpoTags": ["casual | date | work | party | sport | formal のうち適切なもの 1〜3個"],
  "seasonTags": ["spring | summer | autumn | winter のうち適切なもの 1〜3個"]
}

【判定の指針】
- 服に集中する。背景・人物・小物は無視
- name は短く（10文字以内が理想）、誰が見ても何の服か分かる表現
- category は1つだけ選ぶ。トップス + アウター で迷ったら「主に羽織りに見えれば outerwear、上に重ねず1枚で着るなら tops」
- color は「最も占有面積の大きい色」。柄物の場合はベースカラー
- 写真が暗い・ピンボケ等で判別不能なら、最も近い推測で埋めて返す（空にしない）
- 服以外（カーテン・家具等）が写っている場合、category="other", name="判別不能" を返す`

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const imageBase64: string | undefined = body.imageBase64
    const mimeType: string = body.mimeType || 'image/jpeg'

    if (!imageBase64) {
      return NextResponse.json<ClassifyImageResponse>(
        { ok: false, error: 'imageBase64 が必要です' },
        { status: 400 }
      )
    }

    // data URL の prefix を剥がす（クライアントが付けて送ってきた場合の対応）
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '')

    const model = genAI.getGenerativeModel({ model: MODEL })
    const result = await model.generateContent([
      PROMPT,
      {
        inlineData: {
          data: cleanBase64,
          mimeType,
        },
      },
    ])
    const text = result.response.text()

    // 使用ログ（ざっくり概算）
    void logUsage({
      service: 'gemini_style_classify',
      operation: 'classifyImage',
      tokensIn: Math.ceil((PROMPT.length + cleanBase64.length / 100) / 4),
      tokensOut: Math.ceil(text.length / 4),
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json<ClassifyImageResponse>(
        { ok: false, error: 'AI が JSON を返しませんでした' },
        { status: 502 }
      )
    }
    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json<ClassifyImageResponse>({
      ok: true,
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      brand: typeof parsed.brand === 'string' && parsed.brand.length > 0 ? parsed.brand : undefined,
      category: typeof parsed.category === 'string' ? parsed.category : undefined,
      color: typeof parsed.color === 'string' ? parsed.color : undefined,
      tpoTags: Array.isArray(parsed.tpoTags) ? parsed.tpoTags : undefined,
      seasonTags: Array.isArray(parsed.seasonTags) ? parsed.seasonTags : undefined,
    })
  } catch (e) {
    console.error('[/api/classify-image] error:', e)
    return NextResponse.json<ClassifyImageResponse>(
      { ok: false, error: e instanceof Error ? e.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
