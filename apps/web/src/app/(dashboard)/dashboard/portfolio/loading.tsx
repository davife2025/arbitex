import { SkeletonStatRow, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton'

export default function PortfolioLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-32 rounded-lg bg-surface-elevated animate-pulse" />
      <SkeletonStatRow />
      <SkeletonChart height={200} />
      <div className="card"><SkeletonTable rows={4} /></div>
    </div>
  )
}
