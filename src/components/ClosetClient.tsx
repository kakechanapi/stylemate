'use client'
import { useState } from 'react'
import Link from 'next/link'
import ClothingCard from './ClothingCard'
import ClosetFilter from './ClosetFilter'
import type { ClothingItem } from '@/types/fashion'

interface Props {
  items: ClothingItem[]
}

/**
 * クローゼット表示 + カテゴリフィルタ（Client）
 * フィルタはメモリ上で即時切替（Server Round trip しない）
 */
export default function ClosetClient({ items: allItems }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const items =
    activeCategory === 'all'
      ? allItems
      : allItems.filter((c) => c.category === activeCategory)
  const total = allItems.length

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333' }}>クローゼット</h1>
          <p style={{ fontSize: '0.8rem', color: '#bbb' }}>{total}アイテム登録済み</p>
        </div>
        <Link
          href="/register"
          style={{
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            color: '#fff',
            borderRadius: '20px',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          ＋ 追加
        </Link>
      </div>

      {/* Category filter（Client、即時切替） */}
      <ClosetFilter active={activeCategory} onChange={setActiveCategory} />

      {/* Grid or empty state */}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>👗</div>
          <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '20px' }}>
            {activeCategory !== 'all'
              ? 'このカテゴリの服がありません'
              : 'まだ服が登録されていません'}
          </p>
          <Link
            href="/register"
            style={{
              background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
              color: '#fff',
              borderRadius: '24px',
              padding: '12px 28px',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            服を登録する
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {items.map((item) => (
            <ClothingCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
