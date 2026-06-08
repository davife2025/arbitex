import { SkeletonStatRow, SkeletonChart, SkeletonSignalCard } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-40 rounded-lg bg-surface-elevated animate-pulse" />
      <SkeletonStatRow />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          <SkeletonChart height={300} />
          <SkeletonChart height={140} />
        </div>
        <div className="space-y-5">
          <div className="card p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-surface-elevated animate-pulse" />
            ))}
          </div>
          <SkeletonSignalCard />
          <SkeletonSignalCard />
        </div>
      </div>
    </div>
  )
}
