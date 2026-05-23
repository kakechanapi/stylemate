import { SkeletonBox } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <SkeletonBox width={140} height={28} style={{ marginBottom: 8 }} />
          <SkeletonBox width={100} height={14} />
        </div>
        <SkeletonBox width={70} height={30} borderRadius={20} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[...Array(5)].map((_, i) => (
          <SkeletonBox key={i} width={60} height={30} borderRadius={20} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i}>
            <SkeletonBox height={160} borderRadius={16} />
            <SkeletonBox width="80%" height={12} style={{ marginTop: 8 }} />
            <SkeletonBox width="50%" height={10} style={{ marginTop: 4 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
