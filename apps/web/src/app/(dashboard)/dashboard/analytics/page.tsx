'use client'
import { useState } from 'react'
import { useAdvancedSignals } from '@/hooks/useAdvancedSignals'
import { useMarket } from '@/hooks/useMarket'
import { ConfluencePanel } from '@/components/advanced/ConfluencePanel'
import { BacktestPanel } from '@/components/advanced/BacktestPanel'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { clsx } from 'clsx'

const INTERVALS = ['1h', '4h', '1d'] as const
const TOP_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']

export default function AnalyticsPage() {
  const { selectedSymbol, setSelectedSymbol } = useMarket()
  const {
    isAnalyzing, confluence, sizing, backtest,
    generateAdvanced, fetchConfluence, fetchBacktest,
  } = useAdvancedSignals()

  const [btInterval, setBtInterval] = useState<'1h' | '4h' | '1d'>('1h')
  const [btDays, setBtDays] = useState(30)
  const [riskPct, setRiskPct] = useState(1)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-tx-primary">Analytics</h1>
          <p className="text-xs font-mono text-tx-tertiary mt-0.5">
            Multi-timeframe confluence · Kelly sizing · Signal backtesting
          </p>
        </div>
        <Button
          size="sm"
          loading={isAnalyzing}
          onClick={() => generateAdvanced(selectedSymbol, riskPct / 100)}
        >
          ◈ Full Analysis
        </Button>
      </div>

      {/* Symbol selector */}
      <div className="flex gap-1 flex-wrap">
        {TOP_SYMBOLS.map((sym) => (
          <button
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-mono border transition-all',
              selectedSymbol === sym
                ? 'border-brand/40 bg-brand/5 text-brand'
                : 'border-surface-border text-tx-tertiary hover:text-tx-secondary'
            )}
          >
            {sym.replace('USDT', '')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Left: Confluence + Advanced Signal */}
        <div className="space-y-5">
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-tx-primary">Confluence Analysis</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary"
                onClick={() => fetchConfluence(selectedSymbol)}
                loading={isAnalyzing}
              >
                Run Confluence
              </Button>
              <Button size="sm" variant="secondary"
                onClick={() => generateAdvanced(selectedSymbol, riskPct / 100)}
                loading={isAnalyzing}
              >
                Full Signal + Size
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-tx-tertiary">
              <span>Risk per trade:</span>
              {[0.5, 1, 2].map((r) => (
                <button
                  key={r}
                  onClick={() => setRiskPct(r)}
                  className={clsx(
                    'px-2 py-1 rounded-lg border transition-all',
                    riskPct === r
                      ? 'border-brand/40 text-brand bg-brand/5'
                      : 'border-surface-border text-tx-tertiary'
                  )}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>

          {confluence
            ? <ConfluencePanel confluence={confluence} />
            : (
              <div className="card p-8 text-center text-tx-tertiary text-sm font-mono">
                Run confluence analysis to see multi-timeframe breakdown
              </div>
            )
          }

          {/* Position sizing result */}
          {sizing && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-tx-primary">Position Sizing</h3>
                <Badge variant="brand">Kelly {sizing.kelly_fraction.toFixed(2)}%</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                {[
                  { label: 'Recommended Size', value: `${sizing.recommended_size}`, sub: selectedSymbol.replace('USDT', '') },
                  { label: 'Position Value', value: `$${sizing.position_value_usdt.toLocaleString()}` },
                  { label: 'Risk Amount', value: `$${sizing.risk_amount_usdt.toFixed(2)}`, color: 'text-danger' },
                  { label: 'Reward Amount', value: `$${sizing.reward_amount_usdt.toFixed(2)}`, color: 'text-success' },
                  { label: '% Equity at Risk', value: `${sizing.risk_pct_of_equity.toFixed(3)}%` },
                  { label: 'R:R Ratio', value: `${sizing.risk_reward_ratio.toFixed(2)}x` },
                ].map((s) => (
                  <div key={s.label} className="card-elevated p-2">
                    <div className="text-tx-tertiary mb-0.5">{s.label}</div>
                    <div className={clsx('font-semibold', s.color ?? 'text-tx-primary')}>{s.value}</div>
                    {s.sub && <div className="text-tx-tertiary text-[10px]">{s.sub}</div>}
                  </div>
                ))}
              </div>
              {sizing.warnings.length > 0 && (
                <div className="space-y-1">
                  {sizing.warnings.map((w, i) => (
                    <div key={i} className="text-xs font-mono text-warning bg-warning/10 px-2 py-1 rounded">
                      ⚠ {w}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs font-mono text-tx-tertiary leading-relaxed">{sizing.rationale}</p>
            </div>
          )}
        </div>

        {/* Right: Backtesting */}
        <div className="space-y-5">
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-tx-primary">Signal Backtesting</h2>
            <div className="flex gap-2 flex-wrap">
              {INTERVALS.map((iv) => (
                <button
                  key={iv}
                  onClick={() => setBtInterval(iv)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-mono border transition-all',
                    btInterval === iv
                      ? 'border-brand/40 text-brand bg-brand/5'
                      : 'border-surface-border text-tx-tertiary'
                  )}
                >
                  {iv}
                </button>
              ))}
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setBtDays(d)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-mono border transition-all',
                    btDays === d
                      ? 'border-brand/40 text-brand bg-brand/5'
                      : 'border-surface-border text-tx-tertiary'
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fetchBacktest(selectedSymbol, btInterval, btDays)}
              loading={isAnalyzing}
            >
              Run Backtest
            </Button>
          </div>

          {backtest
            ? <BacktestPanel result={backtest} />
            : (
              <div className="card p-8 text-center text-tx-tertiary text-sm font-mono">
                Run a backtest to see signal performance on historical data
              </div>
            )
          }

          {/* Trade list */}
          {backtest && backtest.trades.length > 0 && (
            <div className="card">
              <div className="px-4 py-3 border-b border-surface-border">
                <h3 className="text-sm font-semibold text-tx-primary">Trade Log</h3>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs font-mono">
                  <thead className="sticky top-0 bg-surface-card">
                    <tr className="border-b border-surface-border">
                      {['Dir', 'Entry', 'Exit', 'Reason', 'PnL', 'Bars'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-tx-tertiary">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {backtest.trades.map((t, i) => (
                      <tr key={i} className="border-b border-surface-border/40 hover:bg-surface-elevated/50">
                        <td className={clsx('py-2 px-3 font-semibold', t.direction === 'long' ? 'text-success' : 'text-danger')}>
                          {t.direction === 'long' ? '↑' : '↓'}
                        </td>
                        <td className="py-2 px-3 text-tx-secondary">${t.entry_price.toLocaleString()}</td>
                        <td className="py-2 px-3 text-tx-secondary">${t.exit_price.toLocaleString()}</td>
                        <td className="py-2 px-3 text-tx-tertiary capitalize">{t.exit_reason}</td>
                        <td className={clsx('py-2 px-3 font-semibold', t.pnl_pct >= 0 ? 'text-success' : 'text-danger')}>
                          {t.pnl_pct >= 0 ? '+' : ''}{t.pnl_pct.toFixed(3)}%
                        </td>
                        <td className="py-2 px-3 text-tx-tertiary">{t.bars_held}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
