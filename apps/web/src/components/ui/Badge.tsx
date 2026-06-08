import { clsx } from 'clsx'

type BadgeVariant = 'brand' | 'success' | 'danger' | 'warning' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  dot?: boolean
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  brand: 'bg-brand/10 text-brand border-brand/20',
  success: 'bg-success/10 text-success border-success/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  neutral: 'bg-surface-elevated text-tx-secondary border-surface-border-bright',
}

export function Badge({ variant = 'neutral', children, dot, className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono border font-medium',
      variants[variant], className
    )}>
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full animate-pulse-brand', {
          'bg-brand': variant === 'brand',
          'bg-success': variant === 'success',
          'bg-danger': variant === 'danger',
          'bg-warning': variant === 'warning',
          'bg-tx-secondary': variant === 'neutral',
        })} />
      )}
      {children}
    </span>
  )
}
