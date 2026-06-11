'use client'
import { useState } from 'react'
import { usePerformance } from '@/hooks/usePerformance'
import { EquityCurveChart } from '@/components/charts/EquityCurveChart'
import { WinRateDonut } from '@/components/charts/WinRateDonut'
import { Stat } from '@/components/ui/Stat'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'

const PERIODS = [7, 14, 30, 90] as const

export default function PerformancePage() {
  const [days, setDays] = useState(30)
  const { summary, outcomes, loading, fetchSummary, fetchOutcomes } = usePerformance(days)

  const handlePeriod = (d: number) => {
    setDays(d)
    fetchSummary(d)
  }

  const pnlUp = (summary?.total_pnl_pct ?? 0) >= 0

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-tx-primary">Performance</h1>
          <p className="text-xs font-mono text-tx-tertiary mt-0.5">
            Signal win rate · PnL attribution · Equity curve
          </p>
        </div>
        <div className="flex gap-1">
          {PERIODS.map(d => (
            <button
              key={d}
              onClick={() => handlePeriod(d)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-mono border transition-all',
                days === d
                  ? 'border-brand/40 bg-brand/5 text-brand'
                  : 'border-surface-border text-tx-tertiary hover:text-tx-secondary'
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <Stat
            label="Total PnL"
            value={`${pnlUp ? '+' : ''}${(summary?.total_pnl_pct ?? 0).toFixed(2)}%`}
            trend={pnlUp ? 'up' : 'down'}
            mono
          />
        </div>
        <div className="card p-4">
          <Stat label="Profit Factor" value={(summary?.profit_factor ?? 0).toFixed(2)} mono />
        </div>
        <div className="card p-4">
          <Stat label="Sharpe Ratio" value={(summary?.sharpe_ratio ?? 0).toFixed(2)} mono />
        </div>
        <div className="card p-4">
          <Stat
            label="Avg R:R"
            value={`${(summary?.avg_rr_ratio ?? 0).toFixed(2)}x`}
            mono
          />
        </div>
      </div>

      {/* Win rate + equity curve */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5">

        {/* Donut */}
        <div className="card p-5 flex flex-col items-center gap-4">
          <WinRateDonut
            wins={summary?.wins ?? 0}
            losses={summary?.losses ?? 0}
            expired={summary?.expired ?? 0}
            size={180}
          />
          <div className="flex gap-4 text-xs font-mono">
            <span className="text-success">● {summary?.wins ?? 0} Won</span>
            <span className="text-danger">● {summary?.losses ?? 0} Lost</span>
            <span className="text-tx-tertiary">● {summary?.expired ?? 0} Exp</span>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full pt-2 border-t border-surface-border">
            <div className="text-center">
              <div className="text-xs font-mono text-tx-tertiary mb-0.5">Avg Win</div>
              <div className="text-sm font-mono text-success">+{(summary?.avg_win_pct ?? 0).toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-mono text-tx-tertiary mb-0.5">Avg Loss</div>
              <div className="text-sm font-mono text-danger">-{(summary?.avg_loss_pct ?? 0).toFixed(2)}%</div>
            </div>
          </div>
        </div>

        {/* Equity curve */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-tx-primary">Equity Curve</h2>
            <Badge variant={pnlUp ? 'success' : 'danger'} dot>
              {summary?.resolved ?? 0} resolved signals
            </Badge>
          </div>
          <EquityCurveChart data={summary?.equity_curve ?? []} height={200} />
        </div>
      </div>

      {/* By symbol + by confidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* By symbol */}
        <div className="card">
          <div className="px-4 py-3 border-b border-surface-border">
            <h2 className="text-sm font-semibold text-tx-primary">Performance by Symbol</h2>
          </div>
          {!summary?.by_symbol.length ? (
            <div className="p-6 text-center text-tx-tertiary text-xs font-mono">No data</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-surface-border">
                    {['Symbol', 'Signals', 'Win Rate', 'Total PnL'].map(h => (
                      <th key={h} className="text-left py-2 px-4 text-tx-tertiary">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.by_symbol.map(s => (
                    <tr key={s.symbol} className="border-b border-surface-border/40 hover:bg-surface-elevated/50">
                      <td className="py-2.5 px-4 font-semibold text-tx-primary">{s.symbol}</td>
                      <td className="py-2.5 px-4 text-tx-secondary">{s.total}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant={s.win_rate >= 55 ? 'success' : s.win_rate >= 45 ? 'warning' : 'danger'}>
                          {s.win_rate.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className={clsx('py-2.5 px-4 font-semibold', s.total_pnl_pct >= 0 ? 'text-success' : 'text-danger')}>
                        {s.total_pnl_pct >= 0 ? '+' : ''}{s.total_pnl_pct.toFixed(3)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* By confidence */}
        <div className="card">
          <div className="px-4 py-3 border-b border-surface-border">
            <h2 className="text-sm font-semibold text-tx-primary">Performance by Confidence</h2>
          </div>
          {!summary?.by_confidence.length ? (
            <div className="p-6 text-center text-tx-tertiary text-xs font-mono">No data</div>
          ) : (
            <div className="p-4 space-y-4">
              {summary.by_confidence.map(c => {
                const confColor = c.confidence === 'high' ? 'text-brand' : c.confidence === 'medium' ? 'text-warning' : 'text-tx-secondary'
                const barW = Math.min(100, c.win_rate)
                return (
                  <div key={c.confidence} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className={clsx('capitalize font-semibold', confColor)}>{c.confidence}</span>
                      <div className="flex gap-3 text-tx-tertiary">
                        <span>{c.total} signals</span>
                        <span className={c.avg_pnl_pct >= 0 ? 'text-success' : 'text-danger'}>
                          {c.avg_pnl_pct >= 0 ? '+' : ''}{c.avg_pnl_pct.toFixed(2)}% avg
                        </span>
                        <span className="text-tx-primary">{c.win_rate.toFixed(1)}% WR</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Best / Worst signals */}
      {(summary?.best_signal || summary?.worst_signal) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[
            { label: '🏆 Best Signal', data: summary?.best_signal, color: 'text-success' },
            { label: '💀 Worst Signal', data: summary?.worst_signal, color: 'text-danger' },
          ].map(({ label, data, color }) => data && (
            <div key={label} className="card p-4 space-y-2">
              <div className="text-xs font-mono text-tx-tertiary">{label}</div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-tx-primary">{data.symbol}</span>
                <Badge variant={data.direction === 'long' ? 'success' : 'danger'}>
                  {data.direction}
                </Badge>
                <Badge variant={data.confidence === 'high' ? 'brand' : 'neutral'}>
                  {data.confidence}
                </Badge>
              </div>
              <div className={clsx('text-2xl font-mono font-bold', color)}>
                {parseFloat(data.pnl_pct) >= 0 ? '+' : ''}{parseFloat(data.pnl_pct).toFixed(3)}%
              </div>
              <div className="text-xs font-mono text-tx-tertiary">
                Entry ${parseFloat(data.entry_price).toLocaleString()} →
                Exit ${parseFloat(data.exit_price).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent outcomes table */}
      <div className="card">
        <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-tx-primary">Recent Outcomes</h2>
          <Button size="sm" variant="ghost" loading={loading} onClick={() => fetchOutcomes({ limit: 20 })}>
            Load
          </Button>
        </div>
        {!outcomes.length ? (
          <div className="p-8 text-center text-tx-tertiary text-sm font-mono">
            Click Load to fetch recent signal outcomes
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-surface-border">
                  {['Symbol', 'Dir', 'Conf', 'Entry', 'Exit', 'Result', 'PnL', 'R:R'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-tx-tertiary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outcomes.map(o => (
                  <tr key={o.id} className="border-b border-surface-border/40 hover:bg-surface-elevated/50">
                    <td className="py-2.5 px-3 font-semibold text-tx-primary">{o.symbol}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant={o.direction === 'long' ? 'success' : 'danger'}>
                        {o.direction === 'long' ? '↑' : '↓'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 capitalize text-tx-secondary">{o.confidence}</td>
                    <td className="py-2.5 px-3 text-tx-secondary">${parseFloat(o.entry_price as any).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-tx-secondary">${parseFloat(o.exit_price as any).toLocaleString()}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant={o.outcome === 'win' ? 'success' : o.outcome === 'loss' ? 'danger' : 'neutral'}>
                        {o.outcome}
                      </Badge>
                    </td>
                    <td className={clsx('py-2.5 px-3 font-semibold', o.pnl_pct >= 0 ? 'text-success' : 'text-danger')}>
                      {o.pnl_pct >= 0 ? '+' : ''}{Number(o.pnl_pct).toFixed(3)}%
                    </td>
                    <td className="py-2.5 px-3 text-tx-tertiary">{Number(o.risk_reward_ratio).toFixed(2)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
