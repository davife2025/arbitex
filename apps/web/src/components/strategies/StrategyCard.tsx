'use client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'
import type { Strategy } from '@/types/advanced'

interface Props {
  strategy: Strategy
  onToggle: (id: string, enabled: boolean) => void
  onRun: (id: string) => void
  onDelete: (id: string) => void
  isRunning: boolean
}

const confidenceColor = { high: 'brand', medium: 'warning', low: 'neutral' } as const
const directionLabel = { any: '↕ Any', long: '↑ Long', short: '↓ Short' }

export function StrategyCard({ strategy, onToggle, onRun, onDelete, isRunning }: Props) {
  const lastRun = strategy.last_triggered_at
    ? new Date(strategy.last_triggered_at).toLocaleDateString()
    : 'Never'

  return (
    <div className={clsx(
      'card p-4 space-y-3 transition-all',
      strategy.enabled ? 'border-surface-border' : 'border-surface-border/40 opacity-60'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm text-tx-primary truncate">{strategy.name}</h3>
            <Badge variant={strategy.enabled ? 'success' : 'neutral'} dot={strategy.enabled}>
              {strategy.enabled ? 'Active' : 'Paused'}
            </Badge>
          </div>
          {strategy.description && (
            <p className="text-xs text-tx-tertiary font-mono mt-0.5 truncate">{strategy.description}</p>
          )}
        </div>
        {/* Toggle */}
        <button
          onClick={() => onToggle(strategy.id, !strategy.enabled)}
          className={clsx(
            'relative w-9 h-5 rounded-full transition-colors flex-shrink-0',
            strategy.enabled ? 'bg-success' : 'bg-surface-border'
          )}
        >
          <span className={clsx(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
            strategy.enabled ? 'left-4' : 'left-0.5'
          )} />
        </button>
      </div>

      {/* Symbols */}
      <div className="flex flex-wrap gap-1">
        {strategy.symbols.map(sym => (
          <span key={sym} className="px-2 py-0.5 rounded-md bg-surface-elevated text-[11px] font-mono text-tx-secondary border border-surface-border">
            {sym.replace('USDT', '')}
          </span>
        ))}
      </div>

      {/* Conditions */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="card-elevated p-2">
          <div className="text-tx-tertiary mb-0.5">Confidence</div>
          <Badge variant={confidenceColor[strategy.min_confidence]} className="text-[10px]">
            {strategy.min_confidence.toUpperCase()}+
          </Badge>
        </div>
        <div className="card-elevated p-2">
          <div className="text-tx-tertiary mb-0.5">Direction</div>
          <span className="text-tx-secondary">{directionLabel[strategy.signal_direction]}</span>
        </div>
        <div className="card-elevated p-2">
          <div className="text-tx-tertiary mb-0.5">Min Score</div>
          <span className="text-tx-primary">{strategy.min_confluence_score.toFixed(2)}</span>
        </div>
        <div className="card-elevated p-2">
          <div className="text-tx-tertiary mb-0.5">TF Align</div>
          <span className="text-tx-primary">{strategy.required_timeframe_alignment}/3</span>
        </div>
      </div>

      {/* Features */}
      <div className="flex gap-2 flex-wrap">
        {strategy.auto_paper_trade && (
          <Badge variant="brand">🎮 Auto-paper ${strategy.paper_size_usdt}</Badge>
        )}
        {strategy.auto_alert && (
          <Badge variant="neutral">🔔 Auto-alert</Badge>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-surface-border">
        <div className="text-xs font-mono text-tx-tertiary">
          Triggers: <span className="text-tx-secondary">{strategy.total_triggers}</span>
          <span className="mx-1.5">·</span>
          Last: <span className="text-tx-secondary">{lastRun}</span>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            loading={isRunning}
            onClick={() => onRun(strategy.id)}
          >
            ▶ Run
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-danger hover:text-danger"
            onClick={() => onDelete(strategy.id)}
          >
            ✕
          </Button>
        </div>
      </div>
    </div>
  )
}
