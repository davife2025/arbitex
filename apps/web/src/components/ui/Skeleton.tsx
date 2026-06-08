import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={clsx(
      'rounded-lg bg-surface-elevated animate-pulse',
      className
    )} />
  )
}

export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

export function SkeletonStatRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-surface-border">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24 ml-auto" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonSignalCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-2 py-2 border-y border-surface-border">
        {[0,1,2].map((i) => (
          <div key={i} className="text-center space-y-1">
            <Skeleton className="h-3 w-10 mx-auto" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </div>
        ))}
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  )
}
