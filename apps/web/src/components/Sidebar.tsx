'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { href: '/dashboard/signals', label: 'AI Signals', icon: '◈' },
  { href: '/dashboard/portfolio', label: 'Portfolio', icon: '◎' },
  { href: '/dashboard/orders', label: 'Orders', icon: '≡' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[200px] min-h-screen border-r border-surface-border flex flex-col bg-surface-card">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-border">
        <div className="font-display font-extrabold text-lg tracking-tight">
          <span className="text-brand text-glow-brand">Arbi</span>
          <span className="text-tx-primary">tex</span>
        </div>
        <div className="text-xs font-mono text-tx-tertiary mt-0.5">AI Trading</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                active
                  ? 'bg-brand/10 text-brand border border-brand/20'
                  : 'text-tx-secondary hover:text-tx-primary hover:bg-surface-elevated'
              )}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-surface-border">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse-brand" />
          <span className="text-xs font-mono text-tx-tertiary">Live</span>
        </div>
      </div>
    </aside>
  )
}
