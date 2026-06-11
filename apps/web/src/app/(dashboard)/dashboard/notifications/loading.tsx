export default function NotificationsLoading() {
  return (
    <div className="space-y-5 max-w-2xl">
      <div className="h-8 w-40 rounded-lg bg-surface-elevated animate-pulse" />
      <div className="card overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-4 border-b border-surface-border animate-pulse">
            <div className="w-8 h-8 rounded-full bg-surface-elevated flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-48 bg-surface-elevated rounded" />
              <div className="h-3 w-64 bg-surface-elevated rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
