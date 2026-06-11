'use client'
import { useState } from 'react'
import { usePaperTrading } from '@/hooks/usePaperTrading'
import { useMarket } from '@/hooks/useMarket'
import { PaperOrderPanel } from '@/components/paper/PaperOrderPanel'
import { PaperPositionsTable } from '@/components/paper/PaperPositionsTable'
import { PortfolioChart } from '@/components/charts/PortfolioChart'
import { Stat } from '@/components/ui/Stat'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'

export default function PaperTradingPage() {
  const { summary, loading, resetAccount } = usePaperTrading()
  const { selectedSymbol } = useMarket()
  const [resetting, setResetting] = useState(false)
  const [tab, setTab] = useState<'open' | 'history'>('open')

  const account = summary?.account
  const pnlUp = (account?.total_pnl_usdt ?? 0) >= 0
  const totalEquity = summary?.total_equity ?? account?.balance_usdt ?? 10000
  const returnPct = account
    ? ((totalEquity - account.initial_balance) / account.initial_balance) * 100
    : 0

  const handleReset = async () => {
    setResetting(true)
    await resetAccount(10000)
    setResetting(false)
  }

  // Build mini equity chart from recent trades
  const equityData = (() => {
    if (!summary?.recent_trades.length) return []
    let cum = account?.initial_balance ?? 10000
    return summary.recent_trades
      .filter(t => t.pnl_usdt != null)
      .slice().reverse()
      .map(t => {
        cum += t.pnl_usdt ?? 0
        return { time: new Date(t.executed_at).toLocaleTimeString(), value: cum }
      })
  })()

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-tx-primary">Paper Trading</h1>
          <p className="text-xs font-mono text-tx-tertiary mt-0.5">
            Risk-free simulation · Real market prices · No real funds
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="brand" dot>Simulated</Badge>
          <Button size="sm" variant="secondary" loading={resetting} onClick={handleReset}>
            Reset Account
          </Button>
        </div>
      </div>

      {/* Account stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <Stat
            label="Total Equity"
            value={`$${totalEquity.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
            sub="Paper USDT"
            mono
          />
        </div>
        <div className="card p-4">
          <Stat
            label="Available"
            value={`$${(account?.balance_usdt ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
            sub="Free balance"
            mono
          />
        </div>
        <div className="card p-4">
          <Stat
            label="Total Return"
            value={`${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`}
            trend={returnPct >= 0 ? 'up' : 'down'}
            mono
          />
        </div>
        <div className="card p-4">
          <Stat
            label="Unrealized PnL"
            value={`${(summary?.unrealized_pnl_usdt ?? 0) >= 0 ? '+' : ''}$${(summary?.unrealized_pnl_usdt ?? 0).toFixed(2)}`}
            trend={(summary?.unrealized_pnl_usdt ?? 0) >= 0 ? 'up' : 'down'}
            mono
          />
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">

        {/* Left */}
        <div className="space-y-5">

          {/* Mini equity chart */}
          {equityData.length > 1 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-tx-primary">Paper Equity Curve</h2>
                <span className={clsx(
                  'text-xs font-mono font-semibold',
                  pnlUp ? 'text-success' : 'text-danger'
                )}>
                  {pnlUp ? '+' : ''}${(account?.total_pnl_usdt ?? 0).toFixed(2)}
                </span>
              </div>
              <PortfolioChart data={equityData} height={140} />
            </div>
          )}

          {/* Positions tabs */}
          <div className="card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
              <div className="flex gap-1 p-1 bg-surface rounded-lg">
                {(['open', 'history'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={clsx(
                      'px-3 py-1 rounded-md text-xs font-mono transition-all',
                      tab === t
                        ? 'bg-surface-elevated text-tx-primary'
                        : 'text-tx-tertiary hover:text-tx-secondary'
                    )}
                  >
                    {t === 'open' ? `Open (${summary?.open_positions.length ?? 0})` : 'History'}
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono text-tx-tertiary">
                Started with ${(account?.initial_balance ?? 10000).toLocaleString()}
              </span>
            </div>

            {tab === 'open' ? (
              <PaperPositionsTable positions={summary?.open_positions ?? []} />
            ) : (
              // Trade history
              <div className="overflow-x-auto">
                {!summary?.recent_trades.length ? (
                  <div className="py-10 text-center text-tx-tertiary text-sm font-mono">
                    No trades yet
                  </div>
                ) : (
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-surface-border">
                        {['Symbol','Side','Action','Size','Price','PnL','Time'].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-tx-tertiary">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {summary.recent_trades.map(t => {
                        const pnlUp = (t.pnl_usdt ?? 0) >= 0
                        return (
                          <tr key={t.id} className="border-b border-surface-border/40 hover:bg-surface-elevated/50">
                            <td className="py-2.5 px-3 font-semibold text-tx-primary">{t.symbol}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant={t.side === 'long' ? 'success' : 'danger'}>
                                {t.side === 'long' ? '↑' : '↓'}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 capitalize text-tx-secondary">{t.action}</td>
                            <td className="py-2.5 px-3 text-tx-secondary">{Number(t.size).toFixed(4)}</td>
                            <td className="py-2.5 px-3 text-tx-secondary">${Number(t.price).toLocaleString()}</td>
                            <td className={clsx('py-2.5 px-3 font-semibold', t.pnl_usdt != null ? (pnlUp ? 'text-success' : 'text-danger') : 'text-tx-tertiary')}>
                              {t.pnl_usdt != null
                                ? `${pnlUp ? '+' : ''}$${Number(t.pnl_usdt).toFixed(2)}`
                                : '—'
                              }
                            </td>
                            <td className="py-2.5 px-3 text-tx-tertiary">
                              {new Date(t.executed_at).toLocaleTimeString()}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="space-y-5">
          <PaperOrderPanel />

          {/* Quick info */}
          <div className="card p-4 space-y-3">
            <h3 className="text-xs font-mono text-tx-tertiary uppercase tracking-widest">How it works</h3>
            <ul className="space-y-2 text-xs font-mono text-tx-secondary">
              {[
                'Start with $10,000 virtual USDT',
                'Positions are marked-to-market every 5 seconds',
                'Stops and targets trigger automatically',
                'Open from AI signals or place manual orders',
                'Performance is tracked alongside real signals',
                'Reset anytime — no risk, no consequences',
              ].map((tip, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-brand">›</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
