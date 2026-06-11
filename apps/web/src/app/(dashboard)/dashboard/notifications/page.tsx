'use client'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { clsx } from 'clsx'

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, markRead, markAllRead, remove } = useNotifications()

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-tx-primary">Notifications</h1>
          <p className="text-xs font-mono text-tx-tertiary mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="secondary" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="card p-4 animate-pulse flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-elevated flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-48 bg-surface-elevated rounded" />
                <div className="h-3 w-64 bg-surface-elevated rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-tx-tertiary font-mono text-sm">No notifications yet</p>
          <p className="text-xs font-mono text-tx-tertiary mt-1">
            Alerts from signals, strategies, and price triggers will appear here.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {notifications.map((n, i) => {
            const age = Math.round((Date.now() - new Date(n.created_at).getTime()) / 60000)
            const ageLabel = age < 60 ? `${age}m ago` : age < 1440 ? `${Math.round(age/60)}h ago` : `${Math.round(age/1440)}d ago`

            return (
              <div key={n.id}
                className={clsx(
                  'flex items-start gap-3 px-4 py-4 transition-colors cursor-pointer',
                  i < notifications.length - 1 && 'border-b border-surface-border',
                  !n.read ? 'bg-brand/3 hover:bg-brand/5' : 'hover:bg-surface-elevated/50'
                )}
                onClick={() => !n.read && markRead([n.id])}
              >
                {/* Icon */}
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm',
                  !n.read ? 'bg-brand/15 border border-brand/20' : 'bg-surface-elevated'
                )}>
                  {n.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={clsx('text-sm font-semibold', n.read ? 'text-tx-secondary' : 'text-tx-primary')}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />}
                      <span className="text-[10px] font-mono text-tx-tertiary">{ageLabel}</span>
                    </div>
                  </div>
                  {n.body && (
                    <p className="text-xs font-mono text-tx-tertiary mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="neutral" className="text-[10px]">{n.type.replace(/_/g, ' ')}</Badge>
                    {n.action_url && (
                      <a href={n.action_url}
                        className="text-[10px] font-mono text-brand hover:text-brand/80 transition-colors"
                        onClick={e => e.stopPropagation()}>
                        View →
                      </a>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button onClick={e => { e.stopPropagation(); remove(n.id) }}
                  className="text-tx-tertiary hover:text-danger transition-colors text-xs flex-shrink-0 mt-0.5 p-1">
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
