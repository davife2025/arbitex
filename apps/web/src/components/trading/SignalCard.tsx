'use client'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { usePaperTrading } from '@/hooks/usePaperTrading'
import type { AISignal } from '@arbitex/types'
import { clsx } from 'clsx'

interface SignalCardProps {
  signal: AISignal
  onTrade?: (signal: AISignal) => void
  onDismiss?: (id: string) => void
  showPaperTrade?: boolean
}

const directionConfig = {
  long:    { label: 'LONG',    badge: 'success' as const, arrow: '↑' },
  short:   { label: 'SHORT',   badge: 'danger'  as const, arrow: '↓' },
  neutral: { label: 'NEUTRAL', badge: 'neutral' as const, arrow: '→' },
}

const confidenceConfig = {
  high:   { badge: 'brand'   as const },
  medium: { badge: 'warning' as const },
  low:    { badge: 'neutral' as const },
}

export function SignalCard({ signal, onTrade, onDismiss, showPaperTrade = true }: SignalCardProps) {
  const dir = directionConfig[signal.direction]
  const conf = confidenceConfig[signal.confidence]
  const rr = ((signal.target_price - signal.entry_price) /
    Math.abs(signal.entry_price - signal.stop_loss)).toFixed(2)
  const expiresIn = Math.max(0, Math.round(
    (new Date(signal.expires_at).getTime() - Date.now()) / 60000
  ))

  const { openFromSignal } = usePaperTrading()
  const [paperLoading, setPaperLoading] = useState(false)

  const handlePaperTrade = async () => {
    setPaperLoading(true)
    await openFromSignal(signal.id, 500) // default $500 paper size
    setPaperLoading(false)
  }

  return (
    <div className="card p-4 space-y-3 hover:border-surface-border-bright transition-colors animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-semibold text-tx-primary text-sm">{signal.symbol}</span>
          <Badge variant={dir.badge}>{dir.arrow} {dir.label}</Badge>
          <Badge variant={conf.badge} dot={signal.confidence === 'high'}>
            {signal.confidence.toUpperCase()}
          </Badge>
        </div>
        <span className="text-xs font-mono text-tx-tertiary whitespace-nowrap">
          {expiresIn > 0 ? `${expiresIn}m left` : 'Expiring'}
        </span>
      </div>

      {/* Price levels */}
      <div className="grid grid-cols-3 gap-2 py-2 border-y border-surface-border">
        <div className="text-center">
          <div className="text-xs text-tx-tertiary font-mono mb-1">ENTRY</div>
          <div className="text-sm font-mono text-tx-primary">${signal.entry_price.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-tx-tertiary font-mono mb-1">TARGET</div>
          <div className="text-sm font-mono text-success">${signal.target_price.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-tx-tertiary font-mono mb-1">STOP</div>
          <div className="text-sm font-mono text-danger">${signal.stop_loss.toLocaleString()}</div>
        </div>
      </div>

      {/* R:R + model */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-tx-secondary">
          R:R <span className="text-brand">{rr}x</span>
        </span>
        <span className="text-xs font-mono text-tx-tertiary">
          {signal.model_used?.split('/').pop()}
        </span>
      </div>

      <p className="text-xs text-tx-secondary leading-relaxed line-clamp-2">
        {signal.reasoning}
      </p>

      {/* Actions */}
      <div className="flex gap-2 pt-1 flex-wrap">
        {onTrade && signal.direction !== 'neutral' && (
          <Button
            size="sm"
            variant={signal.direction === 'short' ? 'danger' : 'primary'}
            onClick={() => onTrade(signal)}
            className="flex-1"
          >
            {signal.direction === 'long' ? '↑ Execute Long' : '↓ Execute Short'}
          </Button>
        )}
        {showPaperTrade && signal.direction !== 'neutral' && (
          <Button
            size="sm"
            variant="secondary"
            loading={paperLoading}
            onClick={handlePaperTrade}
            className={clsx(onTrade ? '' : 'flex-1')}
          >
            🎮 Paper
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={() => onDismiss(signal.id)}>
            Dismiss
          </Button>
        )}
      </div>
    </div>
  )
}
