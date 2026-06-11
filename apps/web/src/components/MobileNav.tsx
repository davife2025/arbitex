'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const nav = [
  { href: '/dashboard',             label: 'Home',     icon: '⬡' },
  { href: '/dashboard/signals',     label: 'Signals',  icon: '◈' },
  { href: '/dashboard/paper',       label: 'Paper',    icon: '🎮' },
  { href: '/dashboard/performance', label: 'Stats',    icon: '▲' },
  { href: '/dashboard/settings',    label: 'Settings', icon: '⚙' },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-card border-t border-surface-border
      flex items-center justify-around px-2 pb-safe"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
    >
      {nav.map(item => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[56px]',
              active ? 'text-brand' : 'text-tx-tertiary hover:text-tx-secondary'
            )}
          >
            <span className={clsx('text-xl leading-none', active && 'drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]')}>
              {item.icon}
            </span>
            <span className="text-[10px] font-mono font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
