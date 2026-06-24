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
  // ─── 詳細特徴（migration 0009 対応） ───
  material?: string
  silhouette?: string
  pattern?: string
  neckline?: string
  sleeveType?: string
  lengthType?: string
  transparency?: 'none' | 'slight' | 'significant'
  features?: string[]
  error?: string
}

const PROMPT = `あなたはファッション分類の専門家です。送られた1枚の服の写真を見て、以下を JSON で返してください。

【返答形式：必ず JSON のみ、前後に余計なテキスト不要】
{
  "name": "短い商品名（例：白Tシャツ / 黒スキニーデニム / ベージュトレンチコート / グレーのカーディガン）",
  "brand": "ブランドが写ってる場合のみ（UNIQLO/GU/ZARA 等）。判別不能なら空文字列",
  "category": "tops | bottoms | outerwear | shoes | bag | accessory | dress | other のいずれか",
  "color": "ホワイト / ブラック / グレー / ネイビー / ブルー / レッド / ピンク / グリーン / イエロー / ブラウン / ベージュ / パープル / オレンジ / ボルドー のいずれか（最も近いもの）",
  "tpoTags": ["casual | date | work | party | sport | formal のうち適切なもの 1〜3個（必須・最低1つ）"],
  "seasonTags": ["spring | summer | autumn | winter | all のうち適切なもの（必須・最低1つ）。白T・無地デニム・無地カーディガン等の通年アイテムは ['all'] 1つだけにすると親切"],
  "material": "リネン / コットン / ウール / ナイロン / ポリエステル / シルク / カシミヤ / デニム / ニット / レザー / スウェット / ベロア / ツイード / 不明 のいずれか（最も近いもの）",
  "silhouette": "タイト / レギュラー / ルーズ / オーバーサイズ / Aライン / フレア / ストレート / スキニー / ワイド / 不明 のいずれか",
  "pattern": "無地 / ボーダー / ストライプ / チェック / 花柄 / ドット / アニマル / 迷彩 / ロゴ / グラフィック / 不明 のいずれか",
  "neckline": "クルー / Vネック / タートル / オフショル / ボートネック / ハイネック / ハート / スクエア / シャツカラー / 不明 のいずれか（トップス/ワンピース/アウター以外は '不明'）",
  "sleeveType": "半袖 / 長袖 / 七分袖 / 五分袖 / ノースリーブ / パフスリーブ / フレアスリーブ / 不明 のいずれか（袖が無い服は '不明'）",
  "lengthType": "ショート / ミドル / ロング / マキシ / ミニ / ミディ / 不明 のいずれか",
  "transparency": "none | slight | significant のいずれか（透けない/やや透ける/かなり透ける）",
  "features": ["その他の特徴ラベル（例：'フリル', 'リブ編み', '裏起毛', 'ベルト付き', 'プリーツ'）。最大3個。なければ空配列"]
}

【判定の指針】
- 服に集中する。背景・人物・小物は無視
- name は短く（10文字以内が理想）、誰が見ても何の服か分かる表現
- category は1つだけ選ぶ。トップス + アウター で迷ったら「主に羽織りに見えれば outerwear、上に重ねず1枚で着るなら tops」
- color は「最も占有面積の大きい色」。柄物の場合はベースカラー
- transparency は重要：シアー素材・薄いブラウス・レース等は 'slight' or 'significant' に
- 判別できない項目は '不明' を使う（嘘の値は入れない）
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

    // '不明' を null/undefined に正規化
    const cleanField = (v: unknown): string | undefined => {
      if (typeof v !== 'string') return undefined
      const t = v.trim()
      if (!t || t === '不明') return undefined
      return t
    }

    return NextResponse.json<ClassifyImageResponse>({
      ok: true,
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      brand: typeof parsed.brand === 'string' && parsed.brand.length > 0 ? parsed.brand : undefined,
      category: typeof parsed.category === 'string' ? parsed.category : undefined,
      color: typeof parsed.color === 'string' ? parsed.color : undefined,
      tpoTags: Array.isArray(parsed.tpoTags) ? parsed.tpoTags : undefined,
      // 'all' が含まれていたら 4季節に展開（DB は spring/summer/autumn/winter で管理）
      seasonTags: Array.isArray(parsed.seasonTags)
        ? (parsed.seasonTags.includes('all')
            ? ['spring', 'summer', 'autumn', 'winter']
            : parsed.seasonTags)
        : undefined,
      material: cleanField(parsed.material),
      silhouette: cleanField(parsed.silhouette),
      pattern: cleanField(parsed.pattern),
      neckline: cleanField(parsed.neckline),
      sleeveType: cleanField(parsed.sleeveType),
      lengthType: cleanField(parsed.lengthType),
      transparency: (parsed.transparency === 'none' || parsed.transparency === 'slight' || parsed.transparency === 'significant')
        ? parsed.transparency
        : undefined,
      features: Array.isArray(parsed.features)
        ? parsed.features.filter((f: unknown) => typeof f === 'string' && f.trim() && f !== '不明').slice(0, 5)
        : undefined,
    })
  } catch (e) {
    console.error('[/api/classify-image] error:', e)
    return NextResponse.json<ClassifyImageResponse>(
      { ok: false, error: e instanceof Error ? e.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
