import { SkeletonCard } from '@/components/ui/Skeleton'

export default function WatchlistLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-48 rounded-lg bg-surface-elevated animate-pulse" />
      <div className="h-9 w-72 rounded-xl bg-surface-elevated animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-surface-elevated animate-pulse" />
          ))}
        </div>
        <SkeletonCard />
      </div>
    </div>
  )
}
