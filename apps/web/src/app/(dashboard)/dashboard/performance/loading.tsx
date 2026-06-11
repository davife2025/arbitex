import { SkeletonStatRow, SkeletonChart } from '@/components/ui/Skeleton'
import { Skeleton } from '@/components/ui/Skeleton'

export default function PerformanceLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-40 rounded-lg bg-surface-elevated animate-pulse" />
      <SkeletonStatRow />
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5">
        <div className="card p-5 flex flex-col items-center gap-4">
          <Skeleton className="w-44 h-44 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <SkeletonChart height={200} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SkeletonChart height={200} />
        <SkeletonChart height={200} />
      </div>
    </div>
  )
}
