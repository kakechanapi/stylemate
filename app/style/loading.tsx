import { SkeletonBox } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '16px' }}>
      <SkeletonBox height={80} borderRadius={16} style={{ marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <SkeletonBox height={48} borderRadius={10} />
        <SkeletonBox height={48} borderRadius={10} />
        <SkeletonBox height={48} borderRadius={10} />
      </div>
      <SkeletonBox height={480} borderRadius={20} />
    </div>
  )
}
