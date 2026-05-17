import { ClothingItem } from '@/types/fashion'

const categoryEmoji: Record<string, string> = {
  tops: '👕', bottoms: '👖', outerwear: '🧥', shoes: '👟',
  bag: '👜', accessory: '💍', dress: '👗', other: '🎁',
}

interface Props {
  item: ClothingItem
}

export default function ClothingCard({ item }: Props) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(232,160,191,0.12)',
      border: '1px solid #FFE4F0',
    }}>
      <div style={{
        aspectRatio: '1',
        background: item.image_url ? 'transparent' : '#FFF0F6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: '2.5rem' }}>{categoryEmoji[item.category] || '👗'}</span>
        )}
      </div>
      <div style={{ padding: '10px' }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#333', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </p>
        {item.brand && (
          <p style={{ fontSize: '0.72rem', color: '#999' }}>{item.brand}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', background: '#FFF0F6', color: '#C4779B', borderRadius: '8px', padding: '2px 6px' }}>
            {categoryEmoji[item.category]} {item.category}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#bbb' }}>
            {item.wear_count}回着用
          </span>
        </div>
      </div>
    </div>
  )
}
