import { SkeletonStatRow, SkeletonTable } from '@/components/ui/Skeleton'
import { Skeleton } from '@/components/ui/Skeleton'

export default function PaperLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-44 rounded-lg bg-surface-elevated animate-pulse" />
      <SkeletonStatRow />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          <div className="card p-4">
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="w-full h-36 rounded-lg" />
          </div>
          <div className="card"><SkeletonTable rows={4} /></div>
        </div>
        <div className="card p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
