import { SkeletonTable } from '@/components/ui/Skeleton'
import { Skeleton } from '@/components/ui/Skeleton'

export default function LeaderboardLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-44 rounded-lg bg-surface-elevated animate-pulse" />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4">
          <div className="h-9 w-64 rounded-xl bg-surface-elevated animate-pulse" />
          <div className="card"><SkeletonTable rows={8} /></div>
        </div>
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          </div>
          <div className="card p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-9 rounded-lg" />)}
          </div>
        </div>
      </div>
    </div>
  )
}
