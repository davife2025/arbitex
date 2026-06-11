'use client'
import { clsx } from 'clsx'
import type { ConfluenceResult } from '@/types/advanced'
import { Badge } from '@/components/ui/Badge'

interface Props { confluence: ConfluenceResult }

const scorebar = (score: number) => {
  const pct = ((score + 1) / 2) * 100
  const color = score > 0.15 ? 'bg-success' : score < -0.15 ? 'bg-danger' : 'bg-tx-tertiary'
  return { pct, color }
}

export function ConfluencePanel({ confluence }: Props) {
  const { pct, color } = scorebar(confluence.composite_score)
  const dirVariant = confluence.direction === 'long' ? 'success' : confluence.direction === 'short' ? 'danger' : 'neutral'
  const confVariant = confluence.confidence === 'high' ? 'brand' : confluence.confidence === 'medium' ? 'warning' : 'neutral'

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-tx-primary">Multi-TF Confluence</h3>
        <div className="flex gap-2">
          <Badge variant={dirVariant}>
            {confluence.direction === 'long' ? '↑' : confluence.direction === 'short' ? '↓' : '→'} {confluence.direction.toUpperCase()}
          </Badge>
          <Badge variant={confVariant} dot={confluence.confidence === 'high'}>
            {confluence.confidence.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Composite score bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono text-tx-tertiary">
          <span>Bearish</span>
          <span className="text-tx-secondary">Score: {confluence.composite_score.toFixed(3)}</span>
          <span>Bullish</span>
        </div>
        <div className="relative h-2 rounded-full bg-surface-elevated overflow-hidden">
          {/* Center line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-surface-border-bright" />
          <div
            className={clsx('absolute top-0 bottom-0 rounded-full transition-all', color)}
            style={{
              left: pct < 50 ? `${pct}%` : '50%',
              width: `${Math.abs(pct - 50)}%`,
            }}
          />
        </div>
      </div>

      {/* Timeframe breakdown */}
      <div className="space-y-2">
        <div className="text-xs font-mono text-tx-tertiary uppercase tracking-wider">
          Timeframes ({confluence.aligned_timeframes}/{confluence.total_timeframes} aligned)
        </div>
        {confluence.timeframes.map((tf) => {
          const { pct: tfPct, color: tfColor } = scorebar(tf.score)
          const tfDir = tf.direction === 'long' ? 'success' : tf.direction === 'short' ? 'danger' : 'neutral'
          return (
            <div key={tf.interval} className="flex items-center gap-3">
              <span className="text-xs font-mono text-tx-secondary w-8">{tf.interval}</span>
              <div className="flex-1 relative h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-surface-border" />
                <div
                  className={clsx('absolute top-0 bottom-0 rounded-full', tfColor)}
                  style={{
                    left: tfPct < 50 ? `${tfPct}%` : '50%',
                    width: `${Math.abs(tfPct - 50)}%`,
                  }}
                />
              </div>
              <Badge variant={tfDir as any} className="text-[10px] px-1.5 py-0.5">
                {tf.direction === 'long' ? '↑' : tf.direction === 'short' ? '↓' : '→'}
              </Badge>
              <span className="text-[10px] font-mono text-tx-tertiary w-16">
                RSI {tf.rsi.toFixed(0)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Key levels */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-border">
        <div>
          <div className="text-xs font-mono text-tx-tertiary mb-0.5">Support</div>
          <div className="text-sm font-mono text-success">${confluence.key_support.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs font-mono text-tx-tertiary mb-0.5">Resistance</div>
          <div className="text-sm font-mono text-danger">${confluence.key_resistance.toLocaleString()}</div>
        </div>
      </div>
    </div>
  )
}
