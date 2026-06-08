import { SkeletonSignalCard } from '@/components/ui/Skeleton'

export default function SignalsLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-32 rounded-lg bg-surface-elevated animate-pulse" />
      <div className="h-9 w-64 rounded-xl bg-surface-elevated animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonSignalCard key={i} />)}
      </div>
    </div>
  )
}
