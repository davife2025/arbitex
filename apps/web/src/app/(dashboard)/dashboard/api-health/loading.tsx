import { SkeletonStatRow, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton'

export default function ApiHealthLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-36 rounded-lg bg-surface-elevated animate-pulse" />
      <SkeletonStatRow />
      <SkeletonChart height={160} />
      <div className="card"><SkeletonTable rows={5} /></div>
    </div>
  )
}
