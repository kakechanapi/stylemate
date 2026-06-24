'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductSearchResult, Category } from '@/types/fashion'
import { saveClothingAction } from './actions'
import { uploadClothingImage } from '@/lib/storage'
import { classifyClothing } from '@/lib/clothes-classifier'
import { handleActionResult } from '@/components/SessionExpiredHandler'

type Tab = 'search' | 'photo' | 'manual'

const categories = [
  { id: 'tops', label: 'トップス', emoji: '👕' },
  { id: 'bottoms', label: 'ボトムス', emoji: '👖' },
  { id: 'outerwear', label: 'アウター', emoji: '🧥' },
  { id: 'shoes', label: 'シューズ', emoji: '👟' },
  { id: 'bag', label: 'バッグ', emoji: '👜' },
  { id: 'accessory', label: 'アクセサリー', emoji: '💍' },
  { id: 'dress', label: 'ワンピース', emoji: '👗' },
  { id: 'other', label: 'その他', emoji: '🎁' },
]

const tpoOptions = ['casual', 'date', 'work', 'party', 'sport', 'formal']
const tpoLabels: Record<string, string> = {
  casual: 'カジュアル', date: 'デート', work: '仕事',
  party: 'パーティー', sport: 'アウトドア', formal: 'フォーマル',
}

const seasonOptions = [
  { id: 'spring', label: '🌸 春' },
  { id: 'summer', label: '☀️ 夏' },
  { id: 'autumn', label: '🍁 秋' },
  { id: 'winter', label: '❄️ 冬' },
]

// 4季節すべて選択 ＝ オールシーズン
const ALL_SEASONS = ['spring', 'summer', 'autumn', 'winter']

// ソースIDをユーザー向けの表示名に
function sourceLabel(id: string): string {
  if (id === 'rakuten') return '楽天'
  if (id === 'yahoo') return 'Yahoo!ショッピング'
  if (id === 'google') return 'Google'
  if (id === 'demo') return 'デモ'
  return id
}

// 自動入力された項目に付けるバッジ
function AutoBadge() {
  return (
    <span
      style={{
        display: 'inline-block',
        marginLeft: 8,
        padding: '2px 8px',
        borderRadius: 10,
        background: 'linear-gradient(135deg, #BAD7E9, #E8A0BF)',
        color: '#fff',
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: 0.5,
      }}
    >
      ✨ 自動
    </span>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('search')
  const [keyword, setKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchSources, setSearchSources] = useState<string[]>([])
  const [isDemoOnly, setIsDemoOnly] = useState(false)
  const [selected, setSelected] = useState<ProductSearchResult | null>(null)

  // Manual form
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('tops')
  const [color, setColor] = useState('')
  const [selectedTpo, setSelectedTpo] = useState<string[]>([])
  const [seasonTags, setSeasonTags] = useState<string[]>([])
  // ─── 写真AIで抽出される詳細特徴（保存時にそのまま流す） ───
  const [aiDetails, setAiDetails] = useState<{
    material?: string
    silhouette?: string
    pattern?: string
    neckline?: string
    sleeve_type?: string
    length_type?: string
    transparency?: 'none' | 'slight' | 'significant'
    features?: string[]
  }>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  // ユーザーが手動で触ったかどうか（true なら自動上書きしない）
  const [touched, setTouched] = useState<{
    category?: boolean
    color?: boolean
    tpo?: boolean
    season?: boolean
  }>({})
  // 「自動入力された項目」のバッジ表示用
  const [autoFilled, setAutoFilled] = useState<{
    category?: boolean
    color?: boolean
    tpo?: boolean
    season?: boolean
  }>({})

  // 商品名・ブランドが変わるたびに自動判定 → ユーザー未操作の項目だけ上書き
  useEffect(() => {
    if (!name.trim()) return
    const result = classifyClothing({ name, brand })
    const newAuto: typeof autoFilled = {}
    if (result.category && !touched.category) {
      setCategory(result.category)
      newAuto.category = true
    }
    if (result.color && !touched.color) {
      setColor(result.color)
      newAuto.color = true
    }
    if (result.tpoTags.length > 0 && !touched.tpo) {
      setSelectedTpo(result.tpoTags)
      newAuto.tpo = true
    }
    if (result.seasonTags.length > 0 && !touched.season) {
      setSeasonTags(result.seasonTags)
      newAuto.season = true
    }
    setAutoFilled(newAuto)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, brand])

  // 画像アップロード関連
  const [imageUrl, setImageUrl] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    const result = await uploadClothingImage(file)
    if (result.ok && result.url) {
      setImageUrl(result.url)
    } else {
      setUploadError(result.error || 'アップロード失敗')
    }
    setUploading(false)
    // 同じファイル再選択できるよう値リセット
    e.target.value = ''
  }

  // ─── 📷 写真AI 自動判定 ───
  // ファイル → Storage アップロード + Gemini Vision で自動分類 → manual タブにプリフィル
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [classifying, setClassifying] = useState(false)
  const [classifyError, setClassifyError] = useState('')

  // ファイル → base64 (data URL の prefix なし)
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // "data:image/jpeg;base64,XXXX" → "XXXX"
        const base64 = result.replace(/^data:image\/[a-zA-Z]+;base64,/, '')
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handlePhotoAiPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setClassifying(true)
    setClassifyError('')
    setUploadError('')
    try {
      // 並列実行：①画像を Storage にアップロード ②Gemini Vision で分類
      const base64Promise = fileToBase64(file)
      const uploadPromise = uploadClothingImage(file)

      const [base64, uploadResult] = await Promise.all([base64Promise, uploadPromise])

      // 分類 API 呼び出し
      const classifyRes = await fetch('/api/classify-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type || 'image/jpeg' }),
      })
      const classifyData = await classifyRes.json()

      if (!classifyData.ok) {
        setClassifyError(classifyData.error || 'AI が画像を判定できませんでした')
        setClassifying(false)
        e.target.value = ''
        return
      }

      // 画像 URL を反映（アップロード成功した場合）
      if (uploadResult.ok && uploadResult.url) {
        setImageUrl(uploadResult.url)
      } else if (uploadResult.error) {
        setUploadError(uploadResult.error)
      }

      // AI 判定結果をフォームにプリフィル
      if (classifyData.name) setName(classifyData.name)
      if (classifyData.brand) setBrand(classifyData.brand)
      if (classifyData.category) setCategory(classifyData.category)
      if (classifyData.color) setColor(classifyData.color)
      if (Array.isArray(classifyData.tpoTags) && classifyData.tpoTags.length > 0) {
        setSelectedTpo(classifyData.tpoTags)
      }
      if (Array.isArray(classifyData.seasonTags) && classifyData.seasonTags.length > 0) {
        setSeasonTags(classifyData.seasonTags)
      }
      // 詳細特徴（material/silhouette 等）も保持しておく → 保存時に DB に流す
      setAiDetails({
        material: classifyData.material,
        silhouette: classifyData.silhouette,
        pattern: classifyData.pattern,
        neckline: classifyData.neckline,
        sleeve_type: classifyData.sleeveType,
        length_type: classifyData.lengthType,
        transparency: classifyData.transparency,
        features: classifyData.features,
      })
      // AI が判定した項目はバッジ表示
      setAutoFilled({
        category: !!classifyData.category,
        color: !!classifyData.color,
        tpo: Array.isArray(classifyData.tpoTags) && classifyData.tpoTags.length > 0,
        season: Array.isArray(classifyData.seasonTags) && classifyData.seasonTags.length > 0,
      })

      // 手動タブに遷移して確認 → 保存させる
      setTab('manual')
    } catch (err) {
      setClassifyError(err instanceof Error ? err.message : '不明なエラー')
    } finally {
      setClassifying(false)
      e.target.value = ''
    }
  }

  const handleSearch = async () => {
    if (!keyword.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(keyword)}`)
      const data = await res.json()
      setSearchResults(data)
      const sourcesHeader = res.headers.get('X-Search-Sources') || ''
      setSearchSources(sourcesHeader.split(',').filter(Boolean))
      setIsDemoOnly(res.headers.get('X-Search-Demo-Only') === '1')
    } catch {
      setSearchResults([])
      setSearchSources([])
      setIsDemoOnly(false)
    } finally {
      setSearching(false)
    }
  }

  const handleSelectProduct = (product: ProductSearchResult) => {
    setSelected(product)
    setName(product.name.slice(0, 50))
    setBrand(product.brand)
    setTab('manual')
  }

  const handleSave = async () => {
    if (!name.trim()) return
    // 必須化バリデーション：シーン・シーズンが空ならエラー
    if (selectedTpo.length === 0) {
      setSaveError('シーンを 1 つ以上選んでください')
      return
    }
    if (seasonTags.length === 0) {
      setSaveError('シーズンを 1 つ以上選んでください（通年なら「🌐 オールシーズン」）')
      return
    }
    setSaving(true)
    setSaveError('')
    const result = handleActionResult(
      await saveClothingAction({
        name: name.trim(),
        brand: brand.trim() || undefined,
        category: category as Category,
        color: color.trim() || undefined,
        // アップロード優先 → 楽天検索の画像 → 無し
        image_url: imageUrl || selected?.imageUrl || undefined,
        product_url: selected?.productUrl || undefined,
        tpo_tags: selectedTpo,
        season_tags: seasonTags,
        // 写真AIで抽出した詳細特徴（あれば一緒に保存）
        material: aiDetails.material,
        silhouette: aiDetails.silhouette,
        pattern: aiDetails.pattern,
        neckline: aiDetails.neckline,
        sleeve_type: aiDetails.sleeve_type,
        length_type: aiDetails.length_type,
        transparency: aiDetails.transparency,
        features: aiDetails.features,
      })
    )
    if (!result.ok) {
      setSaveError(result.userMessage || result.error || '保存に失敗しました')
      setSaving(false)
      return
    }
    setSaved(true)
    setSaving(false)
    // 2秒後にリセット & クローゼットへ遷移
    setTimeout(() => {
      setName(''); setBrand(''); setCategory('tops'); setColor('')
      setSelectedTpo([]); setSeasonTags([]); setSelected(null); setSaved(false)
      setKeyword(''); setSearchResults([])
      setImageUrl(''); setUploadError('')
      setTouched({}); setAutoFilled({})
      setAiDetails({})
      setTab('search')
      router.push('/closet')
    }, 1500)
  }

  const toggleTpo = (t: string) => {
    setTouched(prev => ({ ...prev, tpo: true }))
    setAutoFilled(prev => ({ ...prev, tpo: false }))
    setSelectedTpo(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const toggleSeason = (s: string) => {
    setTouched(prev => ({ ...prev, season: true }))
    setAutoFilled(prev => ({ ...prev, season: false }))
    setSeasonTags(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333' }}>服を登録 ＋</h1>
        <p style={{ fontSize: '0.8rem', color: '#bbb' }}>バーコードやブランド検索で簡単登録</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#FFF0F6', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
        {([
          { id: 'search', label: '🔍 検索' },
          { id: 'photo', label: '📷 写真AI' },
          { id: 'manual', label: '✏️ 手動' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '10px',
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? '#C4779B' : '#bbb',
              fontWeight: tab === t.id ? 700 : 400,
              fontSize: '0.82rem',
              boxShadow: tab === t.id ? '0 2px 8px rgba(232,160,191,0.2)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search tab */}
      {tab === 'search' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="ブランド名・商品名で検索（例：UNIQLO ニット）"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={{
                flex: 1,
                border: '2px solid #FFE4F0',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '0.9rem',
                outline: 'none',
                color: '#333',
              }}
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              style={{
                background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
                color: '#fff',
                borderRadius: '12px',
                padding: '12px 16px',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              {searching ? '...' : '検索'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div>
              {/* デモのみの時：目立つ警告バナー */}
              {isDemoOnly && (
                <div
                  style={{
                    background: '#FFF3CD',
                    border: '2px solid #FFE08A',
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                    fontSize: '0.78rem',
                    color: '#856404',
                    lineHeight: 1.5,
                  }}
                >
                  ⚠️ <strong>これはダミー商品です</strong>
                  <br />
                  楽天・Yahoo!ショッピングAPI が未連携のため、開発用のサンプル画像を表示しています。
                  画像・ブランド・商品名は実在の商品とは無関係です。
                  <br />
                  → 手動入力タブで実際の商品情報を登録できます。
                </div>
              )}
              <p style={{ fontSize: '0.8rem', color: '#999', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{searchResults.length}件見つかりました</span>
                {searchSources.length > 0 && (
                  <span style={{ fontSize: '0.66rem', color: '#bbb' }}>
                    （{searchSources.map(sourceLabel).join('・')}）
                  </span>
                )}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {searchResults.map((product, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    className="result-card"
                    aria-label={`${product.brand} ${product.name} を選択`}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt=""
                        style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: '64px', height: '64px', background: '#FFF0F6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                        👗
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.name}
                        {product.source === 'demo' && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: '0.6rem',
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: '#FFE08A',
                              color: '#856404',
                              fontWeight: 800,
                            }}
                          >
                            ダミー
                          </span>
                        )}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#999', marginBottom: '6px' }}>{product.brand}</p>
                      {product.price && (
                        <p style={{ fontSize: '0.8rem', color: '#C4779B', fontWeight: 700 }}>
                          ¥{product.price.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <span className="result-card__cta" aria-hidden="true">
                      選択
                      <span className="result-card__cta-arrow">→</span>
                    </span>
                  </button>
                ))}
              </div>
              <style jsx>{`
                .result-card {
                  display: flex;
                  gap: 12px;
                  align-items: center;
                  background: #fff;
                  border-radius: 14px;
                  padding: 12px;
                  border: 2px solid #ffe4f0;
                  cursor: pointer;
                  width: 100%;
                  font: inherit;
                  color: inherit;
                  text-align: left;
                  transition: transform 0.12s ease, box-shadow 0.18s ease,
                    border-color 0.18s ease, background 0.18s ease;
                  -webkit-tap-highlight-color: transparent;
                }
                .result-card:hover {
                  border-color: #e8a0bf;
                  box-shadow: 0 6px 18px rgba(232, 160, 191, 0.22);
                  transform: translateY(-1px);
                }
                .result-card:active {
                  transform: scale(0.98);
                  background: #fff8fb;
                  box-shadow: 0 1px 4px rgba(232, 160, 191, 0.18);
                }
                .result-card:focus-visible {
                  outline: 3px solid #e8a0bf;
                  outline-offset: 2px;
                }
                .result-card__cta {
                  flex-shrink: 0;
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                  background: linear-gradient(135deg, #ffe4f0, #ffd3e3);
                  color: #c4779b;
                  font-size: 0.72rem;
                  font-weight: 800;
                  padding: 7px 12px;
                  border-radius: 999px;
                  letter-spacing: 0.5px;
                  transition: background 0.18s ease, color 0.18s ease,
                    transform 0.18s ease;
                }
                .result-card:hover .result-card__cta {
                  background: linear-gradient(135deg, #e8a0bf, #c4779b);
                  color: #fff;
                }
                .result-card__cta-arrow {
                  display: inline-block;
                  transition: transform 0.2s ease;
                }
                .result-card:hover .result-card__cta-arrow {
                  transform: translateX(3px);
                }
              `}</style>
            </div>
          )}

          {keyword && !searching && searchResults.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                background: '#FFF8FB',
                borderRadius: 12,
                border: '1px dashed #FFE4F0',
                color: '#888',
                lineHeight: 1.6,
              }}
            >
              <p style={{ fontSize: '0.9rem', marginBottom: 8, color: '#666' }}>
                🛍 商品検索は準備中です
              </p>
              <p style={{ fontSize: '0.78rem', marginBottom: 12 }}>
                楽天 / Yahoo!ショッピング API の連携が完了するまで、
                <br />
                検索結果は表示できません。
              </p>
              <button
                type="button"
                onClick={() => setTab('manual')}
                style={{
                  background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 20,
                  padding: '8px 20px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                手動入力で登録する →
              </button>
            </div>
          )}

          {!keyword && (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
              <p style={{ color: '#ccc', fontSize: '0.88rem', lineHeight: 1.7 }}>
                「UNIQLO フリース」「Zara ニット」など<br />ブランド名＋商品名で検索してみよう
              </p>
            </div>
          )}
        </div>
      )}

      {/* Photo AI tab：写真撮影 → Gemini Vision で自動判定 → 手動タブで確認＆保存 */}
      {tab === 'photo' && (
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📷✨</div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#333', marginBottom: '6px' }}>
            写真からAIで自動登録
          </h3>
          <p style={{ color: '#888', fontSize: '0.82rem', lineHeight: 1.7, marginBottom: '24px' }}>
            スマホで服の写真を撮るだけで、
            <br />
            AI が <b>カテゴリ・色・名前・シーン・季節</b> を自動入力します
          </p>

          {/* ファイル選択 input（カメラ起動 or ギャラリー） */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoAiPick}
            style={{ display: 'none' }}
          />

          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={classifying}
            style={{
              background: classifying
                ? '#ddd'
                : 'linear-gradient(135deg, #E8A0BF, #C4779B)',
              color: '#fff',
              borderRadius: 24,
              padding: '14px 32px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: classifying ? 'wait' : 'pointer',
              boxShadow: classifying ? 'none' : '0 4px 14px rgba(196,121,155,0.35)',
              marginBottom: 16,
            }}
          >
            {classifying ? '🤖 AI が分析中…' : '📷 写真を撮る / 選ぶ'}
          </button>

          {classifyError && (
            <p style={{ color: '#d63384', fontSize: '0.8rem', marginBottom: 12 }}>
              {classifyError}
            </p>
          )}

          {/* 使い方ヒント */}
          <div
            style={{
              background: '#FFF8FB',
              border: '1px solid #FFE4F0',
              borderRadius: 12,
              padding: 14,
              fontSize: '0.74rem',
              color: '#888',
              lineHeight: 1.7,
              textAlign: 'left',
              marginTop: 16,
            }}
          >
            <b style={{ color: '#C4779B' }}>📝 撮影のコツ</b>
            <ul style={{ marginLeft: 18, marginTop: 4 }}>
              <li>明るい場所で、服全体が写るように</li>
              <li>背景は単色がベスト（ハンガー or 床に広げる）</li>
              <li>1枚に1着の服。複数枚は別々に登録</li>
              <li>AI が判定後、手動タブで確認→保存できます</li>
            </ul>
          </div>
        </div>
      )}

      {/* Manual / confirm tab */}
      {tab === 'manual' && (
        <div>
          {selected && (
            <div style={{
              background: '#FFF0F6',
              borderRadius: '14px',
              padding: '12px',
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
            }}>
              {selected.imageUrl && (
                <img src={selected.imageUrl} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} />
              )}
              <div>
                <p style={{ fontSize: '0.78rem', color: '#C4779B', fontWeight: 700 }}>選択中の商品</p>
                <p style={{ fontSize: '0.8rem', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>{selected.name}</p>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* ─── 画像アップロード ─── */}
            <div>
              <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                画像（任意）
              </label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                style={{ display: 'none' }}
              />
              {imageUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="プレビュー"
                    style={{
                      width: 80,
                      height: 80,
                      objectFit: 'cover',
                      borderRadius: 12,
                      border: '2px solid #FFE4F0',
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                      style={{
                        background: '#fff',
                        border: '2px solid #E8A0BF',
                        color: '#C4779B',
                        padding: '6px 12px',
                        borderRadius: 10,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      変更
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      style={{
                        background: '#fff',
                        border: '2px solid #eee',
                        color: '#888',
                        padding: '6px 12px',
                        borderRadius: 10,
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ) : selected?.imageUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selected.imageUrl}
                    alt="楽天画像"
                    style={{
                      width: 80,
                      height: 80,
                      objectFit: 'cover',
                      borderRadius: 12,
                      border: '2px solid #FFE4F0',
                    }}
                  />
                  <div>
                    <p style={{ fontSize: '0.72rem', color: '#888', marginBottom: 4 }}>
                      楽天の画像を使用
                    </p>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                      style={{
                        background: '#fff',
                        border: '2px solid #E8A0BF',
                        color: '#C4779B',
                        padding: '6px 12px',
                        borderRadius: 10,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      自分の写真に変更
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    width: '100%',
                    padding: 16,
                    border: '2px dashed #E8A0BF',
                    background: '#FFF5F8',
                    color: '#C4779B',
                    borderRadius: 12,
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {uploading ? 'アップロード中…' : '📷 写真をアップロード'}
                </button>
              )}
              {uploadError && (
                <p style={{ color: '#d63384', fontSize: '0.72rem', marginTop: 6 }}>
                  {uploadError}
                </p>
              )}
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, display: 'block', marginBottom: '6px' }}>アイテム名 *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例：ホワイトTシャツ"
                style={{ width: '100%', border: '2px solid #FFE4F0', borderRadius: '12px', padding: '12px', fontSize: '0.9rem', outline: 'none', color: '#333' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, display: 'block', marginBottom: '6px' }}>ブランド</label>
              <input
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="例：UNIQLO"
                style={{ width: '100%', border: '2px solid #FFE4F0', borderRadius: '12px', padding: '12px', fontSize: '0.9rem', outline: 'none', color: '#333' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                カテゴリ *
                {autoFilled.category && <AutoBadge />}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setTouched(prev => ({ ...prev, category: true }))
                      setAutoFilled(prev => ({ ...prev, category: false }))
                      setCategory(cat.id)
                    }}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '10px',
                      border: `2px solid ${category === cat.id ? '#E8A0BF' : '#eee'}`,
                      background: category === cat.id ? '#FFF0F6' : '#fff',
                      color: category === cat.id ? '#C4779B' : '#888',
                      fontSize: '0.7rem',
                      fontWeight: category === cat.id ? 700 : 400,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                カラー
                {autoFilled.color && <AutoBadge />}
              </label>
              <input
                type="text"
                value={color}
                onChange={e => {
                  setTouched(prev => ({ ...prev, color: true }))
                  setAutoFilled(prev => ({ ...prev, color: false }))
                  setColor(e.target.value)
                }}
                placeholder="例：ホワイト、ネイビー"
                style={{ width: '100%', border: '2px solid #FFE4F0', borderRadius: '12px', padding: '12px', fontSize: '0.9rem', outline: 'none', color: '#333' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                シーン <span style={{ color: '#C4779B' }}>*</span>
                {autoFilled.tpo && <AutoBadge />}
                {selectedTpo.length === 0 && (
                  <span style={{ color: '#d63384', fontSize: '0.7rem', marginLeft: 8, fontWeight: 500 }}>
                    1つ以上必須
                  </span>
                )}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {tpoOptions.map(t => (
                  <button
                    key={t}
                    onClick={() => toggleTpo(t)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: `2px solid ${selectedTpo.includes(t) ? '#E8A0BF' : '#eee'}`,
                      background: selectedTpo.includes(t) ? '#FFF0F6' : '#fff',
                      color: selectedTpo.includes(t) ? '#C4779B' : '#888',
                      fontSize: '0.78rem',
                      fontWeight: selectedTpo.includes(t) ? 700 : 400,
                    }}
                  >
                    {tpoLabels[t]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                シーズン <span style={{ color: '#C4779B' }}>*</span>
                {autoFilled.season && <AutoBadge />}
                {seasonTags.length === 0 && (
                  <span style={{ color: '#d63384', fontSize: '0.7rem', marginLeft: 8, fontWeight: 500 }}>
                    1つ以上必須
                  </span>
                )}
              </label>
              {/* オールシーズンクイックトグル */}
              <div style={{ marginBottom: 8 }}>
                {(() => {
                  const isAll = ALL_SEASONS.every(s => seasonTags.includes(s))
                  return (
                    <button
                      onClick={() => {
                        setTouched(prev => ({ ...prev, season: true }))
                        setAutoFilled(prev => ({ ...prev, season: false }))
                        // オールシーズン ON → 4つ全部 / OFF → 全部解除
                        setSeasonTags(isAll ? [] : [...ALL_SEASONS])
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 20,
                        border: `2px solid ${isAll ? '#C4779B' : '#eee'}`,
                        background: isAll ? 'linear-gradient(135deg, #FFF0F6, #FFE4F0)' : '#fff',
                        color: isAll ? '#C4779B' : '#888',
                        fontSize: '0.82rem',
                        fontWeight: isAll ? 700 : 600,
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      🌐 オールシーズン{isAll ? '（選択中）' : '（白T・無地デニム等の通年アイテム）'}
                    </button>
                  )
                })()}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {seasonOptions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleSeason(s.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: `2px solid ${seasonTags.includes(s.id) ? '#E8A0BF' : '#eee'}`,
                      background: seasonTags.includes(s.id) ? '#FFF0F6' : '#fff',
                      color: seasonTags.includes(s.id) ? '#C4779B' : '#888',
                      fontSize: '0.78rem',
                      fontWeight: seasonTags.includes(s.id) ? 700 : 400,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {saveError && (
              <p style={{ color: '#d63384', fontSize: '0.8rem', lineHeight: 1.5 }}>
                {saveError}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={!name.trim() || selectedTpo.length === 0 || seasonTags.length === 0 || saving || saved}
              style={{
                background: saved
                  ? 'linear-gradient(135deg, #6ee7b7, #34d399)'
                  : 'linear-gradient(135deg, #E8A0BF, #C4779B)',
                color: '#fff',
                borderRadius: '16px',
                padding: '16px',
                fontWeight: 700,
                fontSize: '1rem',
                opacity: (!name.trim() || selectedTpo.length === 0 || seasonTags.length === 0) ? 0.5 : 1,
                transition: 'all 0.3s',
                marginTop: '8px',
              }}
            >
              {saved ? '✓ 登録しました！' : saving ? '登録中...' : 'クローゼットに追加 ＋'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
