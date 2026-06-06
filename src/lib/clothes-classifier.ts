// 服の自動判定（無料・キーワードマッチのみ）
// 商品名・ブランド名から カテゴリ・カラー・TPO・シーズン を推定する。
// 結果はあくまで「初期値」。ユーザーは登録画面で編集可能。
// 将来 Gemini Vision を足す場合も、このモジュールは「軽量フォールバック」として残す想定。

export type CategoryId =
  | 'tops' | 'bottoms' | 'outerwear' | 'shoes'
  | 'bag' | 'accessory' | 'dress' | 'other'

export interface ClassifyResult {
  category?: CategoryId
  color?: string
  tpoTags: string[]
  seasonTags: string[]
}

// ─────────────────────────────
// カテゴリ判定キーワード（優先順位の高い順に並べる）
// ─────────────────────────────
const CATEGORY_RULES: { id: CategoryId; words: RegExp }[] = [
  // ワンピース・ドレスを最優先（「ワンピ」が他カテゴリのキーワードと被るため）
  { id: 'dress',     words: /ワンピース|ワンピ|ドレス|ローブ/i },
  // アウター（ジャケット系は tops より先に判定）
  { id: 'outerwear', words: /ジャケット|コート|ダウン|ブルゾン|アウター|トレンチ|ステンカラー|モッズ|マウンテンパーカ|パーカー|フリース|ベンチコート|ピーコート|チェスター/i },
  // シューズ
  { id: 'shoes',     words: /スニーカー|ブーツ|パンプス|サンダル|ローファー|ヒール|スリッポン|ハイカット|ローカット|シューズ|靴|草履|スポーツシューズ/i },
  // バッグ
  { id: 'bag',       words: /バッグ|リュック|トート|ショルダー|ハンドバッグ|クラッチ|ボディバッグ|バックパック|ポーチ|サコッシュ/i },
  // アクセサリー
  { id: 'accessory', words: /ネックレス|ピアス|リング|ブレスレット|バングル|イヤリング|指輪|腕時計|時計|ベルト|マフラー|ストール|スカーフ|帽子|ハット|キャップ|手袋|サングラス|めがね|メガネ/i },
  // ボトムス
  { id: 'bottoms',   words: /パンツ|ジーンズ|デニム|スラックス|チノ|ショーツ|ハーフパンツ|スカート|ミニスカ|プリーツ|タイトスカ|レギンス|ジョガー|ワイドパンツ|スカーチョ|ガウチョ|サロペット|オーバーオール/i },
  // トップス（最後：汎用キーワードが多いため）
  { id: 'tops',      words: /Tシャツ|tシャツ|シャツ|カットソー|ニット|セーター|ブラウス|スウェット|カーディガン|ヒートテック|タンクトップ|キャミソール|ベスト|ポロ|チュニック|プルオーバー|長袖|半袖|ロンT|ロンt/i },
]

// ─────────────────────────────
// カラー判定（標準名 → エイリアス）
// ─────────────────────────────
const COLOR_RULES: { name: string; words: RegExp }[] = [
  { name: 'ホワイト', words: /ホワイト|白|white|オフホワイト|アイボリー/i },
  { name: 'ブラック', words: /ブラック|黒|black/i },
  { name: 'グレー',   words: /グレー|gray|grey|チャコール|杢/i },
  { name: 'ネイビー', words: /ネイビー|navy|紺/i },
  { name: 'ブルー',   words: /ブルー|青|blue|サックス|スカイ/i },
  { name: 'レッド',   words: /レッド|赤|red/i },
  { name: 'ピンク',   words: /ピンク|pink|ローズ|サーモン/i },
  { name: 'グリーン', words: /グリーン|緑|green|カーキ|オリーブ|モスグリーン/i },
  { name: 'イエロー', words: /イエロー|黄|yellow|マスタード/i },
  { name: 'ブラウン', words: /ブラウン|茶|brown|キャメル|モカ/i },
  { name: 'ベージュ', words: /ベージュ|beige|ヌード|タン/i },
  { name: 'パープル', words: /パープル|紫|purple|ラベンダー|バイオレット/i },
  { name: 'オレンジ', words: /オレンジ|orange/i },
  { name: 'ボルドー', words: /ボルドー|バーガンディ|ワインレッド|えんじ|ワイン/i },
]

// 暗めの色（仕事・フォーマルに寄せやすい）
const DARK_COLORS = new Set(['ブラック', 'ネイビー', 'グレー', 'ブラウン', 'ボルドー'])
// 明るめの色（デート・パーティに寄せやすい）
const BRIGHT_COLORS = new Set(['ホワイト', 'ピンク', 'ベージュ', 'パープル', 'イエロー', 'オレンジ'])

// ─────────────────────────────
// 判定本体
// ─────────────────────────────
export function classifyClothing(input: {
  name: string
  brand?: string
}): ClassifyResult {
  const haystack = `${input.name} ${input.brand || ''}`.trim()

  // ─── カテゴリ ───
  let category: CategoryId | undefined
  for (const rule of CATEGORY_RULES) {
    if (rule.words.test(haystack)) {
      category = rule.id
      break
    }
  }

  // ─── カラー ───
  let color: string | undefined
  for (const rule of COLOR_RULES) {
    if (rule.words.test(haystack)) {
      color = rule.name
      break
    }
  }

  // ─── TPO ───
  const tpo = new Set<string>()

  // 仕事・フォーマル系のキーワード
  if (/ジャケット|スーツ|スラックス|テーラード|ブレザー|オフィス|きれいめ|キレイめ|セットアップ/i.test(haystack)) {
    tpo.add('work'); tpo.add('formal')
  }
  // フォーマル・パーティ
  if (/ドレス|フォーマル|タキシード|パーティ|お呼ばれ/i.test(haystack)) {
    tpo.add('formal'); tpo.add('party')
  }
  // カジュアル
  if (/Tシャツ|デニム|ジーンズ|スウェット|パーカー|スニーカー|カジュアル|ヒートテック|チノ/i.test(haystack)) {
    tpo.add('casual')
  }
  // スポーツ
  if (/スポーツ|ジャージ|ジョガー|アスレ|ランニング|ジム|ヨガ|アウトドア|マウンテン|登山|キャンプ/i.test(haystack)) {
    tpo.add('sport'); tpo.add('casual')
  }
  // ワンピース・スカート + 明るい色 → デート
  if ((category === 'dress' || /スカート/i.test(haystack)) && color && BRIGHT_COLORS.has(color)) {
    tpo.add('date')
  }
  // 暗い色 + アウター/ボトムス → 仕事に寄りやすい
  if (color && DARK_COLORS.has(color) && (category === 'outerwear' || category === 'bottoms')) {
    tpo.add('work')
  }
  // 何も拾えなければカジュアルをデフォルト付与
  if (tpo.size === 0) tpo.add('casual')

  // ─── シーズン ───
  const seasons = new Set<string>()

  // 春夏：半袖・薄手系
  if (/半袖|ノースリーブ|タンクトップ|リネン|麻|サンダル|ショーツ|キャミ|シア|メッシュ|サマー|涼/i.test(haystack)) {
    seasons.add('spring'); seasons.add('summer')
  }
  // 秋冬：厚手系・防寒
  if (/ニット|セーター|コート|ダウン|フリース|ブーツ|マフラー|長袖|裏起毛|ヒートテック|ウール|カシミヤ|ボア|ファー|ウィンター/i.test(haystack)) {
    seasons.add('autumn'); seasons.add('winter')
  }
  // アウター全般 → 秋冬寄り
  if (category === 'outerwear' && !/春|サマー|スプリング/i.test(haystack)) {
    seasons.add('autumn'); seasons.add('winter')
  }

  return {
    category,
    color,
    tpoTags: Array.from(tpo),
    seasonTags: Array.from(seasons),
  }
}
