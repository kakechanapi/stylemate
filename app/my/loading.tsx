import { SkeletonBox } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '24px 16px' }}>
      <SkeletonBox width={120} height={28} style={{ marginBottom: 20 }} />
      <SkeletonBox height={80} borderRadius={16} style={{ marginBottom: 20 }} />
      <SkeletonBox height={90} borderRadius={16} style={{ marginBottom: 20 }} />
      <SkeletonBox height={180} borderRadius={12} style={{ marginBottom: 20 }} />
      <SkeletonBox height={48} borderRadius={12} />
    </div>
  )
}
