'use client'
import { usePortfolio } from '@/hooks/usePortfolio'
import { Stat } from '@/components/ui/Stat'
import { Badge } from '@/components/ui/Badge'
import { PositionsTable } from '@/components/trading/PositionsTable'
import { PortfolioChart } from '@/components/charts/PortfolioChart'
import { formatPrice, formatPnl } from '@arbitex/utils'

export default function PortfolioPage() {
  const { portfolio } = usePortfolio()

  const mockHistory = Array.from({ length: 48 }, (_, i) => ({
    time: `${Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '30'}`,
    value: (portfolio?.total_equity ?? 10000) * (0.96 + Math.random() * 0.08),
  }))

  const pnlUp = (portfolio?.unrealized_pnl ?? 0) >= 0

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-tx-primary">Portfolio</h1>
        <p className="text-xs font-mono text-tx-tertiary mt-0.5">Connected via Bitget</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Equity', value: `$${formatPrice(portfolio?.total_equity ?? 0)}`, sub: 'USDT' },
          { label: 'Available', value: `$${formatPrice(portfolio?.available_balance ?? 0)}`, sub: 'Free margin' },
          { label: 'Unrealized PnL', value: formatPnl(portfolio?.unrealized_pnl ?? 0), trend: pnlUp ? 'up' : 'down' as any },
          { label: 'Positions', value: portfolio?.positions?.length ?? 0, sub: 'Open' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <Stat {...s} mono />
          </div>
        ))}
      </div>

      {/* Equity chart */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-tx-primary">Equity Curve (48h)</h2>
          <Badge variant={pnlUp ? 'success' : 'danger'} dot>
            {pnlUp ? 'Profitable' : 'In drawdown'}
          </Badge>
        </div>
        <PortfolioChart data={mockHistory} height={200} />
      </div>

      {/* Balances */}
      {portfolio && (
        <div className="card">
          <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-tx-primary">Asset Balances</h2>
          </div>
          <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(portfolio as any).balances?.map((b: any) => (
              <div key={b.currency} className="card-elevated p-3">
                <div className="text-xs font-mono text-tx-tertiary mb-1">{b.currency}</div>
                <div className="text-sm font-mono font-semibold text-tx-primary">
                  {formatPrice(b.total, 4)}
                </div>
                <div className="text-xs font-mono text-tx-secondary mt-0.5">
                  {formatPrice(b.available, 4)} free
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positions */}
      <div className="card">
        <div className="px-4 py-3 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-tx-primary">Open Positions</h2>
        </div>
        <PositionsTable />
      </div>
    </div>
  )
}
