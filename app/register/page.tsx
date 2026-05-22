'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProductSearchResult, Category } from '@/types/fashion'
import { saveClothingAction } from './actions'

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

export default function RegisterPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('search')
  const [keyword, setKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<ProductSearchResult | null>(null)

  // Manual form
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('tops')
  const [color, setColor] = useState('')
  const [selectedTpo, setSelectedTpo] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleSearch = async () => {
    if (!keyword.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(keyword)}`)
      const data = await res.json()
      setSearchResults(data)
    } catch {
      setSearchResults([])
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
    const result = await saveClothingAction({
      name: name.trim(),
      brand: brand.trim() || undefined,
      category: category as Category,
      color: color.trim() || undefined,
      image_url: selected?.imageUrl || undefined,
      product_url: selected?.productUrl || undefined,
      tpo_tags: selectedTpo,
    })
    if (!result.ok) {
      setSaveError(result.error || '保存に失敗しました')
      setSaving(false)
      return
    }
    setSaved(true)
    setSaving(false)
    // 2秒後にリセット & クローゼットへ遷移
    setTimeout(() => {
      setName(''); setBrand(''); setCategory('tops'); setColor('')
      setSelectedTpo([]); setSelected(null); setSaved(false)
      setKeyword(''); setSearchResults([])
      setTab('search')
      router.push('/closet')
    }, 1500)
  }

  const toggleTpo = (t: string) => {
    setSelectedTpo(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
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
              <p style={{ fontSize: '0.8rem', color: '#999', marginBottom: '10px' }}>
                {searchResults.length}件見つかりました
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {searchResults.map((product, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectProduct(product)}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      background: '#fff',
                      borderRadius: '14px',
                      padding: '12px',
                      border: '2px solid #FFE4F0',
                      cursor: 'pointer',
                    }}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: '64px', height: '64px', background: '#FFF0F6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                        👗
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.name}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#999', marginBottom: '6px' }}>{product.brand}</p>
                      {product.price && (
                        <p style={{ fontSize: '0.8rem', color: '#C4779B', fontWeight: 700 }}>
                          ¥{product.price.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div style={{ color: '#E8A0BF', fontSize: '1.2rem', alignSelf: 'center' }}>→</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {keyword && !searching && searchResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: '#ccc' }}>
              <p>検索結果がありません</p>
              <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>手動入力で登録できます</p>
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
              <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, display: 'block', marginBottom: '8px' }}>カテゴリ *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
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
              <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, display: 'block', marginBottom: '6px' }}>カラー</label>
              <input
                type="text"
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="例：ホワイト、ネイビー"
                style={{ width: '100%', border: '2px solid #FFE4F0', borderRadius: '12px', padding: '12px', fontSize: '0.9rem', outline: 'none', color: '#333' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, display: 'block', marginBottom: '8px' }}>TPOタグ（複数選択可）</label>
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
