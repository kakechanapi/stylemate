import { SkeletonBox } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <SkeletonBox width={80} height={28} style={{ marginBottom: 8 }} />
          <SkeletonBox width={70} height={14} />
        </div>
        <SkeletonBox width={70} height={30} borderRadius={20} />
      </div>
      <SkeletonBox height={68} borderRadius={12} style={{ marginBottom: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <SkeletonBox height={160} borderRadius={16} />
            <SkeletonBox width="70%" height={14} style={{ marginTop: 8 }} />
            <SkeletonBox width="40%" height={10} style={{ marginTop: 4 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
