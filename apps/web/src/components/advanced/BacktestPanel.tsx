'use client'
import { clsx } from 'clsx'
import type { BacktestResult } from '@/types/advanced'
import { Badge } from '@/components/ui/Badge'
import { Stat } from '@/components/ui/Stat'

interface Props { result: BacktestResult }

export function BacktestPanel({ result }: Props) {
  const winRateVariant = result.win_rate >= 55 ? 'success' : result.win_rate >= 45 ? 'warning' : 'danger'
  const pnlUp = result.total_pnl_pct >= 0

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-tx-primary">{result.symbol} Backtest</h3>
          <p className="text-xs font-mono text-tx-tertiary mt-0.5">
            {new Date(result.period_start).toLocaleDateString()} → {new Date(result.period_end).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={winRateVariant}>{result.win_rate.toFixed(1)}% Win Rate</Badge>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Total PnL"
          value={`${result.total_pnl_pct >= 0 ? '+' : ''}${result.total_pnl_pct.toFixed(2)}%`}
          trend={pnlUp ? 'up' : 'down'}
          mono
        />
        <Stat label="Profit Factor" value={result.profit_factor.toFixed(2)} mono />
        <Stat label="Sharpe Ratio" value={result.sharpe_ratio.toFixed(2)} mono />
        <Stat label="Max Drawdown" value={`${result.max_drawdown_pct.toFixed(2)}%`} trend="down" mono />
      </div>

      {/* Trade breakdown */}
      <div className="flex gap-3 text-xs font-mono">
        <div className="flex-1 card-elevated p-2 text-center">
          <div className="text-success font-semibold">{result.winning_trades}</div>
          <div className="text-tx-tertiary">Won</div>
        </div>
        <div className="flex-1 card-elevated p-2 text-center">
          <div className="text-danger font-semibold">{result.losing_trades}</div>
          <div className="text-tx-tertiary">Lost</div>
        </div>
        <div className="flex-1 card-elevated p-2 text-center">
          <div className="text-tx-secondary font-semibold">{result.expired_trades}</div>
          <div className="text-tx-tertiary">Expired</div>
        </div>
      </div>

      {/* Avg win / loss */}
      <div className="flex gap-4 text-xs font-mono pt-1 border-t border-surface-border">
        <span className="text-tx-tertiary">Avg win</span>
        <span className="text-success">+{result.avg_win_pct.toFixed(2)}%</span>
        <span className="text-tx-tertiary ml-auto">Avg loss</span>
        <span className="text-danger">-{result.avg_loss_pct.toFixed(2)}%</span>
      </div>
    </div>
  )
}
