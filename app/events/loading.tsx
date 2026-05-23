import { SkeletonBox } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <SkeletonBox width={140} height={28} />
        <div style={{ display: 'flex', gap: 8 }}>
          <SkeletonBox width={60} height={28} borderRadius={20} />
          <SkeletonBox width={60} height={28} borderRadius={20} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <SkeletonBox width={20} height={20} borderRadius={4} />
        <SkeletonBox width={100} height={20} />
        <SkeletonBox width={20} height={20} borderRadius={4} />
      </div>
      <SkeletonBox height={280} borderRadius={20} style={{ marginBottom: 16 }} />
      <SkeletonBox height={60} borderRadius={12} style={{ marginBottom: 8 }} />
      <SkeletonBox height={60} borderRadius={12} />
    </div>
  )
}
