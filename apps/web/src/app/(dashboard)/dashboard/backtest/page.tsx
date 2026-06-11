'use client'
import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Stat } from '@/components/ui/Stat'
import { EquityCurveChart } from '@/components/charts/EquityCurveChart'
import { clsx } from 'clsx'
import type { BacktestResult } from '@/types/advanced'
import type { ApiResponse } from '@arbitex/types'

const SYMBOLS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT']
const INTERVALS = ['1h','4h','1d'] as const
const PERIODS = [7,14,30,60,90] as const

function TradeRow({ trade }: { trade: any }) {
  const isWin = trade.exit_reason === 'target'
  return (
    <tr className="border-b border-surface-border/40 hover:bg-surface-elevated/40 transition-colors text-xs font-mono">
      <td className="py-2 px-3">
        <Badge variant={trade.direction === 'long' ? 'success' : 'danger'}>
          {trade.direction === 'long' ? '↑' : '↓'}
        </Badge>
      </td>
      <td className="py-2 px-3 text-tx-secondary">${trade.entry_price.toLocaleString()}</td>
      <td className="py-2 px-3 text-tx-secondary">${trade.exit_price.toLocaleString()}</td>
      <td className="py-2 px-3">
        <Badge variant={isWin ? 'success' : trade.exit_reason === 'stop' ? 'danger' : 'neutral'}>
          {trade.exit_reason}
        </Badge>
      </td>
      <td className={clsx('py-2 px-3 font-semibold', trade.pnl_pct >= 0 ? 'text-success' : 'text-danger')}>
        {trade.pnl_pct >= 0 ? '+' : ''}{trade.pnl_pct.toFixed(3)}%
      </td>
      <td className="py-2 px-3 text-tx-tertiary">{trade.bars_held}b</td>
      <td className="py-2 px-3 text-tx-tertiary">{trade.risk_reward_ratio.toFixed(2)}x</td>
    </tr>
  )
}

export default function BacktestPage() {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [interval, setInterval] = useState<'1h'|'4h'|'1d'>('1h')
  const [days, setDays] = useState(30)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAllTrades, setShowAllTrades] = useState(false)

  const runBacktest = useCallback(async () => {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.get<ApiResponse<BacktestResult>>(
        `/api/signals/backtest/${symbol}?interval=${interval}&days=${days}`
      )
      if (res.success && res.data) setResult(res.data)
      else setError(res.error ?? 'Backtest failed')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }, [symbol, interval, days])

  const trades = showAllTrades ? result?.trades ?? [] : (result?.trades ?? []).slice(0, 10)

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-tx-primary">Backtesting</h1>
        <p className="text-xs font-mono text-tx-tertiary mt-0.5">
          Simulate stored AI signals against historical price data
        </p>
      </div>

      {/* Config */}
      <div className="card p-4 space-y-4">
        <h2 className="text-sm font-semibold text-tx-primary">Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Symbol */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-tx-secondary uppercase tracking-widest">Symbol</label>
            <div className="flex flex-wrap gap-1">
              {SYMBOLS.map(s => (
                <button key={s} onClick={() => setSymbol(s)}
                  className={clsx('px-2.5 py-1 rounded-lg text-xs font-mono border transition-all',
                    symbol === s ? 'border-brand/40 bg-brand/10 text-brand' : 'border-surface-border text-tx-tertiary hover:text-tx-secondary'
                  )}>
                  {s.replace('USDT','')}
                </button>
              ))}
            </div>
          </div>

          {/* Interval */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-tx-secondary uppercase tracking-widest">Candle Interval</label>
            <div className="flex gap-1">
              {INTERVALS.map(iv => (
                <button key={iv} onClick={() => setInterval(iv)}
                  className={clsx('px-3 py-1 rounded-lg text-xs font-mono border transition-all',
                    interval === iv ? 'border-brand/40 bg-brand/10 text-brand' : 'border-surface-border text-tx-tertiary'
                  )}>
                  {iv}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-tx-secondary uppercase tracking-widest">Lookback Period</label>
            <div className="flex gap-1 flex-wrap">
              {PERIODS.map(d => (
                <button key={d} onClick={() => setDays(d)}
                  className={clsx('px-2.5 py-1 rounded-lg text-xs font-mono border transition-all',
                    days === d ? 'border-brand/40 bg-brand/10 text-brand' : 'border-surface-border text-tx-tertiary'
                  )}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button loading={running} onClick={runBacktest} className="w-full sm:w-auto">
          ▶ Run Backtest — {symbol} {interval} ({days}d)
        </Button>

        {error && (
          <div className="text-xs font-mono text-danger bg-danger/10 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {running && (
        <div className="card p-8 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin mx-auto" />
          <p className="text-sm font-mono text-tx-secondary">
            Simulating {symbol} signals against {days} days of {interval} candles...
          </p>
        </div>
      )}

      {result && !running && (
        <div className="space-y-4 animate-fade-in">

          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4">
              <Stat label="Total PnL"
                value={`${result.total_pnl_pct >= 0 ? '+' : ''}${result.total_pnl_pct.toFixed(3)}%`}
                trend={result.total_pnl_pct >= 0 ? 'up' : 'down'} mono />
            </div>
            <div className="card p-4">
              <Stat label="Win Rate" value={`${result.win_rate.toFixed(1)}%`}
                trend={result.win_rate >= 50 ? 'up' : 'down'} mono />
            </div>
            <div className="card p-4">
              <Stat label="Profit Factor" value={result.profit_factor.toFixed(3)} mono />
            </div>
            <div className="card p-4">
              <Stat label="Sharpe Ratio" value={result.sharpe_ratio.toFixed(3)} mono />
            </div>
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Signals', value: result.total_signals },
              { label: 'Trades Simulated', value: result.total_trades },
              { label: 'Wins', value: result.winning_trades },
              { label: 'Losses', value: result.losing_trades },
              { label: 'Expired', value: result.expired_trades },
              { label: 'Avg Win', value: `+${result.avg_win_pct.toFixed(3)}%` },
              { label: 'Avg Loss', value: `-${result.avg_loss_pct.toFixed(3)}%` },
              { label: 'Max Drawdown', value: `-${result.max_drawdown_pct.toFixed(3)}%` },
            ].map(s => (
              <div key={s.label} className="card-elevated p-2.5 text-xs font-mono">
                <div className="text-tx-tertiary mb-0.5">{s.label}</div>
                <div className="text-tx-primary font-semibold">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Context */}
          <div className="card p-4">
            <div className="flex items-center gap-3 text-xs font-mono text-tx-tertiary flex-wrap">
              <span>Symbol: <span className="text-tx-secondary">{result.symbol}</span></span>
              <span>·</span>
              <span>From: <span className="text-tx-secondary">{new Date(result.period_start).toLocaleDateString()}</span></span>
              <span>·</span>
              <span>To: <span className="text-tx-secondary">{new Date(result.period_end).toLocaleDateString()}</span></span>
              <span>·</span>
              <Badge variant={result.total_pnl_pct >= 0 ? 'success' : 'danger'}>
                {result.total_pnl_pct >= 0 ? 'Profitable' : 'Unprofitable'} strategy
              </Badge>
            </div>
          </div>

          {/* Equity curve */}
          {result.trades.length > 1 && (() => {
            let cum = 0
            const curveData = result.trades.map(t => {
              cum += t.pnl_pct
              return {
                date: new Date(t.entry_time).toLocaleDateString(),
                cumulative_pnl_pct: parseFloat(cum.toFixed(4)),
                signal_count: 1,
              }
            })
            return (
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-tx-primary mb-4">
                  Equity Curve — {result.total_trades} trades
                </h3>
                <EquityCurveChart data={curveData} height={220} />
              </div>
            )
          })()}

          {/* Trade log */}
          {result.trades.length > 0 && (
            <div className="card">
              <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-tx-primary">
                  Trade Log
                  <span className="ml-2 text-xs font-mono text-tx-tertiary">
                    ({result.trades.length} trades)
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-border">
                      {['Dir','Entry','Exit','Result','PnL','Bars','R:R'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[10px] font-mono text-tx-tertiary uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade, i) => <TradeRow key={i} trade={trade} />)}
                  </tbody>
                </table>
              </div>
              {result.trades.length > 10 && (
                <div className="px-4 py-2 border-t border-surface-border text-center">
                  <button
                    onClick={() => setShowAllTrades(s => !s)}
                    className="text-xs font-mono text-brand hover:text-brand/80 transition-colors"
                  >
                    {showAllTrades ? `Show less` : `Show all ${result.trades.length} trades`}
                  </button>
                </div>
              )}
            </div>
          )}

          {result.total_trades === 0 && (
            <div className="card p-8 text-center">
              <p className="text-tx-tertiary font-mono text-sm">No tradeable signals found in this period</p>
              <p className="text-xs font-mono text-tx-tertiary mt-1">
                Generate more signals for {symbol} or extend the lookback period.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
