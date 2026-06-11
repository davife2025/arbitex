import { SkeletonStatRow } from '@/components/ui/Skeleton'
import { Skeleton } from '@/components/ui/Skeleton'

export default function JournalLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-40 rounded-lg bg-surface-elevated animate-pulse" />
      <SkeletonStatRow />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2 animate-pulse">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
