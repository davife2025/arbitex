import { SkeletonStatRow } from '@/components/ui/Skeleton'
import { Skeleton } from '@/components/ui/Skeleton'

export default function BacktestLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-36 rounded-lg bg-surface-elevated animate-pulse" />
      <div className="card p-4 space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <div className="flex gap-2">
              {[1,2,3,4,5].map(j => <Skeleton key={j} className="h-8 w-14 rounded-lg" />)}
            </div>
          </div>
        ))}
        <Skeleton className="h-9 w-64 rounded-lg" />
      </div>
    </div>
  )
}
