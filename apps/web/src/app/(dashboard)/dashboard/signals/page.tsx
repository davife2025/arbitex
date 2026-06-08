'use client'
import { useState } from 'react'
import { useSignals } from '@/hooks/useSignals'
import { useMarket } from '@/hooks/useMarket'
import { SignalCard } from '@/components/trading/SignalCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { clsx } from 'clsx'

const TOP_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']
const FILTERS = ['active', 'triggered', 'expired', 'cancelled'] as const

export default function SignalsPage() {
  const { signals, isGenerating, generateSignal, generateBatch, updateSignalStatus, fetchMarketOverview } = useSignals()
  const { selectedSymbol } = useMarket()
  const [filter, setFilter] = useState<typeof FILTERS[number]>('active')
  const [overview, setOverview] = useState<string | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)

  const filtered = signals.filter((s) => s.status === filter)

  const handleOverview = async () => {
    setOverviewLoading(true)
    const data = await fetchMarketOverview()
    if (data) setOverview(data.overview)
    setOverviewLoading(false)
  }

  const handleBatch = async () => {
    setBatchLoading(true)
    await generateBatch({ symbols: TOP_SYMBOLS, interval: '1h' })
    setBatchLoading(false)
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-tx-primary">AI Signals</h1>
          <p className="text-xs font-mono text-tx-tertiary mt-0.5">Powered by Kimi K2 · moonshotai</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" loading={overviewLoading} onClick={handleOverview}>
            Market Overview
          </Button>
          <Button size="sm" variant="secondary" loading={batchLoading} onClick={handleBatch}>
            Scan Top 5
          </Button>
          <Button
            size="sm"
            loading={isGenerating}
            onClick={() => generateSignal({ symbol: selectedSymbol, interval: '1h' })}
          >
            ◈ Generate
          </Button>
        </div>
      </div>

      {/* Market overview */}
      {overview && (
        <div className="card p-4 border-brand/20 bg-brand/5 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="brand" dot>Market Overview</Badge>
            <span className="text-xs font-mono text-tx-tertiary">Kimi K2</span>
          </div>
          <p className="text-sm text-tx-secondary leading-relaxed">{overview}</p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-surface-card rounded-xl border border-surface-border w-fit">
        {FILTERS.map((f) => {
          const count = signals.filter((s) => s.status === f).length
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-4 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2',
                filter === f
                  ? 'bg-surface-elevated text-tx-primary'
                  : 'text-tx-tertiary hover:text-tx-secondary'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {count > 0 && (
                <span className={clsx(
                  'px-1.5 py-0.5 rounded-full text-[10px]',
                  filter === f ? 'bg-brand/20 text-brand' : 'bg-surface-elevated text-tx-tertiary'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Signal grid */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-tx-tertiary font-mono text-sm">No {filter} signals</p>
          {filter === 'active' && (
            <Button
              size="sm" variant="secondary"
              className="mt-4 mx-auto"
              loading={isGenerating}
              onClick={() => generateSignal({ symbol: selectedSymbol })}
            >
              Generate first signal
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((sig) => (
            <SignalCard
              key={sig.id}
              signal={sig}
              onDismiss={filter === 'active' ? (id) => updateSignalStatus(id, 'cancelled') : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
