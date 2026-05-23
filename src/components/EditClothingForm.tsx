'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ClothingItem, Category } from '@/types/fashion'
import { updateClothingAction } from '@/app/closet/actions'

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'tops', label: 'トップス', emoji: '👕' },
  { id: 'bottoms', label: 'ボトムス', emoji: '👖' },
  { id: 'outerwear', label: 'アウター', emoji: '🧥' },
  { id: 'shoes', label: 'シューズ', emoji: '👟' },
  { id: 'bag', label: 'バッグ', emoji: '👜' },
  { id: 'accessory', label: 'アクセ', emoji: '💍' },
  { id: 'dress', label: 'ワンピ', emoji: '👗' },
  { id: 'other', label: 'その他', emoji: '🎁' },
]

const TPO_OPTIONS = ['casual', 'date', 'work', 'party', 'sport', 'formal']
const TPO_LABEL: Record<string, string> = {
  casual: 'カジュアル', date: 'デート', work: '仕事',
  party: 'パーティー', sport: 'スポーツ', formal: 'フォーマル',
}

export default function EditClothingForm({ item }: { item: ClothingItem }) {
  const router = useRouter()
  const [name, setName] = useState(item.name)
  const [brand, setBrand] = useState(item.brand || '')
  const [category, setCategory] = useState<Category>(item.category)
  const [color, setColor] = useState(item.color || '')
  const [tpoTags, setTpoTags] = useState<string[]>(item.tpo_tags || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleTpo = (t: string) =>
    setTpoTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const handleSave = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    setError('')
    const result = await updateClothingAction(item.id, {
      name: name.trim(),
      brand: brand.trim() || undefined,
      category,
      color: color.trim() || undefined,
      tpo_tags: tpoTags,
    })
    if (!result.ok) {
      setError(result.error || '保存に失敗しました')
      setSaving(false)
      return
    }
    router.push('/closet')
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <Field label="アイテム名" required>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
      </Field>

      <Field label="ブランド">
        <input
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          style={inputStyle}
        />
      </Field>

      <Field label="カテゴリ" required>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {CATEGORIES.map((c) => {
            const active = c.id === category
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                style={{
                  padding: '8px 4px',
                  borderRadius: 10,
                  border: `2px solid ${active ? '#E8A0BF' : '#eee'}`,
                  background: active ? '#FFF0F6' : '#fff',
                  color: active ? '#C4779B' : '#888',
                  fontSize: '0.75rem',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '1.2rem' }}>{c.emoji}</div>
                <div>{c.label}</div>
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="色">
        <input
          type="text"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="例：ホワイト"
          style={inputStyle}
        />
      </Field>

      <Field label="TPO">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TPO_OPTIONS.map((t) => {
            const active = tpoTags.includes(t)
            return (
              <button
                key={t}
                onClick={() => toggleTpo(t)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: `2px solid ${active ? '#E8A0BF' : '#FFE4F0'}`,
                  background: active ? '#FFF0F6' : '#fff',
                  color: active ? '#C4779B' : '#888',
                  fontSize: '0.82rem',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {TPO_LABEL[t]}
              </button>
            )
          })}
        </div>
      </Field>

      {error && <p style={{ color: '#d63384', fontSize: '0.8rem' }}>{error}</p>}

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, #fff 70%, transparent)',
          padding: '12px 20px 90px',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          style={{
            width: '100%',
            padding: 14,
            background:
              name.trim() && !saving ? 'linear-gradient(135deg, #E8A0BF, #C4779B)' : '#ddd',
            color: '#fff',
            border: 'none',
            borderRadius: 16,
            fontSize: '1rem',
            fontWeight: 700,
            cursor: name.trim() && !saving ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '2px solid #FFE4F0',
  borderRadius: 12,
  fontSize: '0.95rem',
  boxSizing: 'border-box',
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: '0.7rem',
          color: '#999',
          fontWeight: 700,
          letterSpacing: 1,
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {label.toUpperCase()}
        {required && <span style={{ color: '#C4779B' }}>*</span>}
      </div>
      {children}
    </div>
  )
}
