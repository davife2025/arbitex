'use client'
import { usePortfolio } from '@/hooks/usePortfolio'
import { Badge } from '@/components/ui/Badge'
import { formatPrice, formatPnl } from '@arbitex/utils'

export function PositionsTable() {
  const { portfolio } = usePortfolio()
  const positions = portfolio?.positions ?? []

  if (!positions.length) {
    return (
      <div className="flex items-center justify-center py-12 text-tx-tertiary text-sm font-mono">
        No open positions
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-surface-border">
            {['Symbol', 'Side', 'Size', 'Entry', 'Mark', 'PnL', 'Lev'].map((h) => (
              <th key={h} className="text-left py-2 px-3 text-tx-tertiary uppercase tracking-wider font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const isProfit = p.unrealized_pnl >= 0
            return (
              <tr key={p.id} className="border-b border-surface-border/50 hover:bg-surface-card/50 transition-colors">
                <td className="py-3 px-3 text-tx-primary font-semibold">{p.symbol}</td>
                <td className="py-3 px-3">
                  <Badge variant={p.side === 'long' ? 'success' : 'danger'}>
                    {p.side.toUpperCase()}
                  </Badge>
                </td>
                <td className="py-3 px-3 text-tx-primary">{p.size}</td>
                <td className="py-3 px-3 text-tx-secondary">${formatPrice(p.entry_price)}</td>
                <td className="py-3 px-3 text-tx-primary">${formatPrice(p.mark_price)}</td>
                <td className={`py-3 px-3 font-semibold ${isProfit ? 'text-success' : 'text-danger'}`}>
                  {formatPnl(p.unrealized_pnl)}
                </td>
                <td className="py-3 px-3 text-tx-secondary">{p.leverage}x</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
