'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductSearchResult, Category } from '@/types/fashion'
import { saveClothingAction } from './actions'
import { uploadClothingImage } from '@/lib/storage'
import { classifyClothing } from '@/lib/clothes-classifier'
import { handleActionResult } from '@/components/SessionExpiredHandler'

type Tab = 'search' | 'barcode' | 'manual'

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
          { id: 'barcode', label: '📷 バーコード' },
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

      {/* Barcode tab */}
      {tab === 'barcode' && (
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📷</div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
            バーコードスキャン
          </h3>
          <p style={{ color: '#bbb', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: '24px' }}>
            服のタグに付いているバーコードを<br />カメラで読み取ります
          </p>
          <div style={{
            background: '#000',
            borderRadius: '20px',
            padding: '24px',
            margin: '0 auto 20px',
            maxWidth: '280px',
            aspectRatio: '4/3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              border: '3px solid #E8A0BF',
              borderRadius: '8px',
              width: '70%',
              height: '40%',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '-5%',
                right: '-5%',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #E8A0BF, transparent)',
              }} />
            </div>
            <p style={{ position: 'absolute', bottom: '12px', color: '#fff', fontSize: '0.75rem', opacity: 0.7 }}>
              カメラプレビュー（開発中）
            </p>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#bbb', marginBottom: '20px' }}>
            ※ バーコードスキャン機能は次バージョンで対応予定
          </p>
          <button
            onClick={() => setTab('search')}
            style={{
              background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
              color: '#fff',
              borderRadius: '24px',
              padding: '12px 28px',
              fontWeight: 700,
            }}
          >
            ブランド検索で登録する
          </button>
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
                TPOタグ（複数選択可）
                {autoFilled.tpo && <AutoBadge />}
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
                シーズン（複数選択可）
                {autoFilled.season && <AutoBadge />}
              </label>
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
              disabled={!name.trim() || saving || saved}
              style={{
                background: saved
                  ? 'linear-gradient(135deg, #6ee7b7, #34d399)'
                  : 'linear-gradient(135deg, #E8A0BF, #C4779B)',
                color: '#fff',
                borderRadius: '16px',
                padding: '16px',
                fontWeight: 700,
                fontSize: '1rem',
                opacity: !name.trim() ? 0.5 : 1,
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
