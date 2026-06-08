'use client'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useMarket } from '@/hooks/useMarket'
import { useSignals } from '@/hooks/useSignals'
import { Stat } from '@/components/ui/Stat'
import { Button } from '@/components/ui/Button'
import { SignalCard } from '@/components/trading/SignalCard'
import { OrderPanel } from '@/components/trading/OrderPanel'
import { PositionsTable } from '@/components/trading/PositionsTable'
import { CandleChart } from '@/components/charts/CandleChart'
import { PortfolioChart } from '@/components/charts/PortfolioChart'
import { formatPrice, formatPnl, formatPercent } from '@arbitex/utils'

export default function DashboardPage() {
  const { portfolio } = usePortfolio()
  const { candles, selectedSymbol } = useMarket()
  const { signals, isGenerating, generateSignal, updateSignalStatus } = useSignals()

  const activeSignals = signals.filter((s) => s.status === 'active').slice(0, 3)
  const pnlUp = (portfolio?.unrealized_pnl ?? 0) >= 0

  // Mock portfolio history for chart (Session 5: replace with real data)
  const mockHistory = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    value: (portfolio?.total_equity ?? 10000) * (0.97 + Math.random() * 0.06),
  }))

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-tx-primary">Dashboard</h1>
          <p className="text-xs font-mono text-tx-tertiary mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          loading={isGenerating}
          onClick={() => generateSignal({ symbol: selectedSymbol, interval: '1h' })}
        >
          ◈ Generate Signal
        </Button>
      </div>

      {/* Portfolio stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <Stat
            label="Total Equity"
            value={`$${formatPrice(portfolio?.total_equity ?? 0)}`}
            sub="USDT"
            mono
          />
        </div>
        <div className="card p-4">
          <Stat
            label="Available"
            value={`$${formatPrice(portfolio?.available_balance ?? 0)}`}
            sub="Free margin"
            mono
          />
        </div>
        <div className="card p-4">
          <Stat
            label="Unrealized PnL"
            value={formatPnl(portfolio?.unrealized_pnl ?? 0)}
            trend={pnlUp ? 'up' : 'down'}
            mono
          />
        </div>
        <div className="card p-4">
          <Stat
            label="Active Signals"
            value={activeSignals.length}
            sub={`of ${signals.length} total`}
          />
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">

        {/* Left column */}
        <div className="space-y-5">

          {/* Chart */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-tx-primary">{selectedSymbol}</h2>
                <p className="text-xs font-mono text-tx-tertiary">1H Candles</p>
              </div>
            </div>
            <CandleChart candles={candles} height={300} />
          </div>

          {/* Portfolio chart */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-tx-primary">Equity Curve</h2>
              <span className={`text-xs font-mono font-semibold ${pnlUp ? 'text-success' : 'text-danger'}`}>
                {formatPercent(((portfolio?.unrealized_pnl ?? 0) / (portfolio?.total_equity ?? 1)) * 100)}
              </span>
            </div>
            <PortfolioChart data={mockHistory} height={140} />
          </div>

          {/* Positions */}
          <div className="card">
            <div className="px-4 py-3 border-b border-surface-border">
              <h2 className="text-sm font-semibold text-tx-primary">Open Positions</h2>
            </div>
            <PositionsTable />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <OrderPanel />

          {/* AI Signals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-tx-primary">AI Signals</h2>
              <span className="text-xs font-mono text-tx-tertiary">Kimi K2</span>
            </div>

            {activeSignals.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-tx-tertiary text-xs font-mono">No active signals</p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3 mx-auto"
                  loading={isGenerating}
                  onClick={() => generateSignal({ symbol: selectedSymbol })}
                >
                  Generate now
                </Button>
              </div>
            ) : (
              activeSignals.map((sig) => (
                <SignalCard
                  key={sig.id}
                  signal={sig}
                  onDismiss={(id) => updateSignalStatus(id, 'cancelled')}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
