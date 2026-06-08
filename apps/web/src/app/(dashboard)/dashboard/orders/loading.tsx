import { SkeletonTable } from '@/components/ui/Skeleton'

export default function OrdersLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-28 rounded-lg bg-surface-elevated animate-pulse" />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <div className="card"><SkeletonTable rows={6} /></div>
        <div className="card p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-surface-elevated animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
