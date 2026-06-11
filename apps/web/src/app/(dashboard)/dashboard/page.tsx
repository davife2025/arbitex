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
import { OrderBookChart } from '@/components/charts/OrderBookChart'
import { MarketCommentaryCard } from '@/components/MarketCommentaryCard'
import { RiskDashboard } from '@/components/risk/RiskDashboard'
import { formatPrice, formatPnl, formatPercent } from '@arbitex/utils'

export default function DashboardPage() {
  const { portfolio } = usePortfolio()
  const { candles, selectedSymbol } = useMarket()
  const { signals, isGenerating, generateSignal, updateSignalStatus } = useSignals()

  const activeSignals = signals.filter(s => s.status === 'active').slice(0, 3)
  const pnlUp = (portfolio?.unrealized_pnl ?? 0) >= 0

  const mockHistory = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    value: (portfolio?.total_equity ?? 10000) * (0.97 + Math.random() * 0.06),
  }))

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-tx-primary">Dashboard</h1>
          <p className="text-xs font-mono text-tx-tertiary mt-0.5 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button size="sm" variant="secondary" loading={isGenerating}
          onClick={() => generateSignal({ symbol: selectedSymbol, interval: '1h' })}>
          <span className="hidden xs:inline">◈ </span>Generate
        </Button>
      </div>

      {/* Market commentary */}
      <MarketCommentaryCard />

      {/* Portfolio stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="card p-3 sm:p-4">
          <Stat label="Equity" value={`$${formatPrice(portfolio?.total_equity ?? 0)}`} sub="USDT" mono />
        </div>
        <div className="card p-3 sm:p-4">
          <Stat label="Available" value={`$${formatPrice(portfolio?.available_balance ?? 0)}`} sub="Free" mono />
        </div>
        <div className="card p-3 sm:p-4">
          <Stat label="Unreal. PnL" value={formatPnl(portfolio?.unrealized_pnl ?? 0)}
            trend={pnlUp ? 'up' : 'down'} mono />
        </div>
        <div className="card p-3 sm:p-4">
          <Stat label="Signals" value={activeSignals.length} sub="Active" />
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">

        {/* Left */}
        <div className="space-y-4">
          {/* Candle chart + order book side by side on lg+ */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-4">
            <div className="card p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-tx-primary">{selectedSymbol}</h2>
                  <p className="text-xs font-mono text-tx-tertiary">1H Candles</p>
                </div>
              </div>
              <CandleChart candles={candles} height={220} />
            </div>

            {/* Order book — hidden on mobile to save space */}
            <div className="card p-3 hidden lg:block">
              <h2 className="text-xs font-mono text-tx-secondary uppercase tracking-widest mb-3">
                Order Book
              </h2>
              <OrderBookChart symbol={selectedSymbol} depth={10} refreshMs={4000} />
            </div>
          </div>

          {/* Portfolio chart */}
          <div className="card p-3 sm:p-4 hidden sm:block">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-tx-primary">Equity Curve</h2>
              <span className={`text-xs font-mono font-semibold ${pnlUp ? 'text-success' : 'text-danger'}`}>
                {formatPercent(((portfolio?.unrealized_pnl ?? 0) / (portfolio?.total_equity ?? 1)) * 100)}
              </span>
            </div>
            <PortfolioChart data={mockHistory} height={120} />
          </div>

          {/* Positions */}
          <div className="card">
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-surface-border">
              <h2 className="text-sm font-semibold text-tx-primary">Open Positions</h2>
            </div>
            <PositionsTable />
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <OrderPanel />
          <RiskDashboard equity={portfolio?.total_equity ?? 10000} />

          {/* AI Signals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-tx-primary">AI Signals</h2>
              <span className="text-xs font-mono text-tx-tertiary">Kimi K2</span>
            </div>
            {activeSignals.length === 0 ? (
              <div className="card p-5 text-center">
                <p className="text-tx-tertiary text-xs font-mono">No active signals</p>
                <Button size="sm" variant="secondary" className="mt-3 mx-auto"
                  loading={isGenerating}
                  onClick={() => generateSignal({ symbol: selectedSymbol })}>
                  Generate now
                </Button>
              </div>
            ) : (
              activeSignals.map(sig => (
                <SignalCard key={sig.id} signal={sig}
                  onDismiss={id => updateSignalStatus(id, 'cancelled')} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
