'use client'
import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'
import type { Notification } from '@/types/advanced'

function NotificationItem({ n, onRead, onDelete }: {
  n: Notification
  onRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const age = Math.round((Date.now() - new Date(n.created_at).getTime()) / 60000)
  const ageLabel = age < 60 ? `${age}m` : `${Math.round(age / 60)}h`

  return (
    <div
      className={clsx(
        'flex items-start gap-3 px-4 py-3 border-b border-surface-border transition-colors cursor-pointer',
        n.read ? 'opacity-60' : 'bg-brand/3 hover:bg-brand/5'
      )}
      onClick={() => !n.read && onRead(n.id)}
    >
      <span className="text-lg leading-none mt-0.5 flex-shrink-0">{n.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={clsx('text-xs font-semibold truncate', n.read ? 'text-tx-secondary' : 'text-tx-primary')}>
            {n.title}
          </p>
          <span className="text-[10px] font-mono text-tx-tertiary flex-shrink-0">{ageLabel}</span>
        </div>
        {n.body && (
          <p className="text-[11px] font-mono text-tx-tertiary mt-0.5 line-clamp-2">{n.body}</p>
        )}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(n.id) }}
        className="text-tx-tertiary hover:text-danger text-xs flex-shrink-0 mt-0.5 transition-colors"
      >
        ✕
      </button>
    </div>
  )
}

export function NotificationBell() {
  const { notifications, unreadCount, loading, markRead, markAllRead, remove } = useNotifications()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-tx-secondary hover:text-tx-primary hover:bg-surface-elevated transition-all"
      >
        <span className="text-base leading-none">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-mono font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 card shadow-2xl z-50 animate-slide-up overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-tx-primary">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs font-mono text-brand">{unreadCount} new</span>
                )}
              </h3>
              {unreadCount > 0 && (
                <Button size="sm" variant="ghost" onClick={markAllRead}
                  className="text-xs text-tx-tertiary hover:text-brand">
                  Mark all read
                </Button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-12 rounded bg-surface-elevated animate-pulse" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-tx-tertiary">
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 20).map(n => (
                  <NotificationItem
                    key={n.id} n={n}
                    onRead={markRead}
                    onDelete={remove}
                  />
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-surface-border text-center">
                <a href="/dashboard/notifications"
                  className="text-xs font-mono text-brand hover:text-brand/80 transition-colors"
                  onClick={() => setOpen(false)}>
                  View all →
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
