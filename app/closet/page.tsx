'use client'
import { useState } from 'react'
import Link from 'next/link'
import ClothingCard from '@/components/ClothingCard'
import { ClothingItem, Category } from '@/types/fashion'

const categories: { id: Category | 'all'; label: string; emoji: string }[] = [
  { id: 'all', label: 'すべて', emoji: '👗' },
  { id: 'tops', label: 'トップス', emoji: '👕' },
  { id: 'bottoms', label: 'ボトムス', emoji: '👖' },
  { id: 'outerwear', label: 'アウター', emoji: '🧥' },
  { id: 'shoes', label: 'シューズ', emoji: '👟' },
  { id: 'bag', label: 'バッグ', emoji: '👜' },
  { id: 'accessory', label: 'アクセ', emoji: '💍' },
  { id: 'dress', label: 'ワンピ', emoji: '👗' },
]

// Demo items
const demoItems: ClothingItem[] = [
  {
    id: '1',
    user_id: 'demo',
    name: 'ホワイトTシャツ',
    brand: 'UNIQLO',
    category: 'tops',
    color: 'ホワイト',
    image_url: '',
    tpo_tags: ['casual'],
    season_tags: ['spring', 'summer'],
    wear_count: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: 'demo',
    name: 'スキニーデニム',
    brand: 'GU',
    category: 'bottoms',
    color: 'ブルー',
    image_url: '',
    tpo_tags: ['casual', 'date'],
    season_tags: ['all'],
    wear_count: 12,
    created_at: new Date().toISOString(),
  },
]

export default function ClosetPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [items] = useState<ClothingItem[]>(demoItems)

  const filtered = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory)

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333' }}>クローゼット</h1>
          <p style={{ fontSize: '0.8rem', color: '#bbb' }}>{items.length}アイテム登録済み</p>
        </div>
        <Link href="/register" style={{
          background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
          color: '#fff',
          borderRadius: '20px',
          padding: '8px 16px',
          fontSize: '0.85rem',
          fontWeight: 700,
        }}>
          ＋ 追加
        </Link>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: '20px',
              border: `2px solid ${activeCategory === cat.id ? '#E8A0BF' : '#eee'}`,
              background: activeCategory === cat.id ? '#FFF0F6' : '#fff',
              color: activeCategory === cat.id ? '#C4779B' : '#888',
              fontSize: '0.78rem',
              fontWeight: activeCategory === cat.id ? 700 : 400,
              whiteSpace: 'nowrap',
            }}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>👗</div>
          <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '20px' }}>
            まだ服が登録されていません
          </p>
          <Link href="/register" style={{
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            color: '#fff',
            borderRadius: '24px',
            padding: '12px 28px',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}>
            服を登録する
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {filtered.map(item => (
            <ClothingCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
