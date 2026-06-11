'use client'
import { useState } from 'react'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useStrategies } from '@/hooks/useStrategies'
import { WatchlistPanel } from '@/components/watchlist/WatchlistPanel'
import { StrategyCard } from '@/components/strategies/StrategyCard'
import { StrategyBuilder } from '@/components/strategies/StrategyBuilder'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { clsx } from 'clsx'

type Tab = 'watchlist' | 'strategies'

export default function WatchlistPage() {
  const [tab, setTab] = useState<Tab>('watchlist')
  const [showBuilder, setShowBuilder] = useState(false)
  const { items } = useWatchlist()
  const { strategies, running, create, toggle, remove, run } = useStrategies()

  const activeStrategies = strategies.filter(s => s.enabled).length

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-tx-primary">Watchlist & Strategies</h1>
          <p className="text-xs font-mono text-tx-tertiary mt-0.5">
            Track symbols · Set price alerts · Automate signal generation
          </p>
        </div>
        {tab === 'strategies' && (
          <Button size="sm" onClick={() => setShowBuilder(true)}>
            + New Strategy
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-card rounded-xl border border-surface-border w-fit">
        {([
          { key: 'watchlist', label: 'Watchlist', count: items.length },
          { key: 'strategies', label: 'Strategies', count: strategies.length, active: activeStrategies },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2',
              tab === t.key ? 'bg-surface-elevated text-tx-primary' : 'text-tx-tertiary hover:text-tx-secondary'
            )}
          >
            {t.label}
            <span className={clsx(
              'px-1.5 py-0.5 rounded-full text-[10px]',
              tab === t.key ? 'bg-brand/20 text-brand' : 'bg-surface-elevated text-tx-tertiary'
            )}>
              {t.count}
            </span>
            {'active' in t && t.active > 0 && (
              <Badge variant="success" dot className="text-[10px] px-1.5 py-0.5">
                {t.active} live
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Watchlist tab */}
      {tab === 'watchlist' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <WatchlistPanel />
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-tx-primary">How price alerts work</h3>
            <ul className="space-y-2 text-xs font-mono text-tx-secondary">
              {[
                'Add any symbol to your watchlist',
                'Set an "alert above" and/or "alert below" price',
                'Alerts are checked every 5 seconds on each market tick',
                'When triggered: WS broadcast + Telegram/email notification',
                'Alerts auto-reset when you update the threshold',
                'Click a symbol to load its chart in the dashboard',
              ].map((tip, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="text-brand mt-0.5">›</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Strategies tab */}
      {tab === 'strategies' && (
        <div className="space-y-4">

          {/* Builder */}
          {showBuilder && (
            <StrategyBuilder
              onSave={async (params) => {
                await create(params)
                setShowBuilder(false)
              }}
              onCancel={() => setShowBuilder(false)}
            />
          )}

          {/* Strategy cards */}
          {strategies.length === 0 && !showBuilder ? (
            <div className="card p-12 text-center space-y-4">
              <p className="text-tx-tertiary font-mono text-sm">No strategies yet</p>
              <p className="text-xs font-mono text-tx-tertiary max-w-sm mx-auto">
                Strategies automatically run confluence analysis on your chosen symbols every 15 minutes,
                generate signals when conditions are met, and optionally open paper trades.
              </p>
              <Button size="sm" className="mx-auto" onClick={() => setShowBuilder(true)}>
                Create First Strategy
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {strategies.map(strategy => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  onToggle={toggle}
                  onRun={run}
                  onDelete={remove}
                  isRunning={running === strategy.id}
                />
              ))}
            </div>
          )}

          {/* How strategies work */}
          {strategies.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-mono text-tx-tertiary uppercase tracking-widest mb-3">
                Strategy evaluation order
              </h3>
              <div className="flex items-center gap-2 flex-wrap text-xs font-mono text-tx-secondary">
                {[
                  '1. Run confluence (1h/4h/1d)',
                  '→ Check direction filter',
                  '→ Check min score',
                  '→ Check TF alignment',
                  '→ Generate Kimi K2 signal',
                  '→ Check confidence',
                  '→ Auto paper trade (if enabled)',
                  '→ Send alert (if enabled)',
                ].map((step, i) => (
                  <span key={i} className={clsx(
                    'px-2 py-1 rounded-lg',
                    i === 0 ? 'bg-brand/10 text-brand' : 'bg-surface-elevated'
                  )}>
                    {step}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
