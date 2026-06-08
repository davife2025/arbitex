import { clsx } from 'clsx'

interface StatProps {
  label: string
  value: string | number
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  mono?: boolean
  className?: string
}

export function Stat({ label, value, sub, trend, mono, className }: StatProps) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <span className="text-xs font-mono text-tx-secondary uppercase tracking-widest">{label}</span>
      <span className={clsx(
        'text-2xl font-bold',
        mono && 'font-mono',
        trend === 'up' && 'text-success',
        trend === 'down' && 'text-danger',
        !trend && 'text-tx-primary',
      )}>
        {value}
      </span>
      {sub && <span className="text-xs text-tx-tertiary font-mono">{sub}</span>}
    </div>
  )
}
