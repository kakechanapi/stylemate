import { SkeletonBox } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '20px 16px' }}>
      <SkeletonBox height={32} width="50%" style={{ marginBottom: 20 }} />
      <SkeletonBox height={100} style={{ marginBottom: 12 }} />
      <SkeletonBox height={80} style={{ marginBottom: 12 }} />
      <SkeletonBox height={80} />
    </div>
  )
}
