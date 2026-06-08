import { clsx } from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  suffix?: string
}

export function Input({ label, error, suffix, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-mono text-tx-secondary uppercase tracking-widest">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={clsx(
            'w-full bg-surface border rounded-lg px-3 py-2 text-sm font-mono text-tx-primary',
            'placeholder:text-tx-tertiary outline-none transition-all',
            'border-surface-border focus:border-brand/60 focus:ring-1 focus:ring-brand/20',
            suffix && 'pr-12',
            error && 'border-danger/60',
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-tx-tertiary">
            {suffix}
          </span>
        )}
      </div>
      {error && <span className="text-xs text-danger font-mono">{error}</span>}
    </div>
  )
}
