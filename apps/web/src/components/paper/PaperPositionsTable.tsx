'use client'
import { clsx } from 'clsx'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { usePaperTrading } from '@/hooks/usePaperTrading'
import { useMarket } from '@/hooks/useMarket'
import type { PaperPosition } from '@/types/advanced'

interface Props { positions: PaperPosition[] }

export function PaperPositionsTable({ positions }: Props) {
  const { closePosition } = usePaperTrading()
  const { tickers } = useMarket()

  if (!positions.length) {
    return (
      <div className="flex items-center justify-center py-10 text-tx-tertiary text-sm font-mono">
        No open paper positions
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-surface-border">
            {['Symbol','Side','Size','Entry','Mark','Target','Stop','Unreal. PnL',''].map(h => (
              <th key={h} className="text-left py-2 px-3 text-tx-tertiary font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map(pos => {
            const ticker = tickers.find(t => t.symbol === pos.symbol)
            const markPrice = ticker?.last_price ?? pos.mark_price
            const pnlUp = pos.unrealized_pnl_usdt >= 0

            return (
              <tr key={pos.id} className="border-b border-surface-border/50 hover:bg-surface-card/50 transition-colors">
                <td className="py-3 px-3 font-semibold text-tx-primary">{pos.symbol}</td>
                <td className="py-3 px-3">
                  <Badge variant={pos.side === 'long' ? 'success' : 'danger'}>
                    {pos.side === 'long' ? '↑' : '↓'} {pos.side.toUpperCase()}
                  </Badge>
                </td>
                <td className="py-3 px-3 text-tx-secondary">{pos.size.toFixed(4)}</td>
                <td className="py-3 px-3 text-tx-secondary">${pos.entry_price.toLocaleString()}</td>
                <td className="py-3 px-3 text-tx-primary">${markPrice.toLocaleString()}</td>
                <td className="py-3 px-3 text-success">${pos.target_price.toLocaleString()}</td>
                <td className="py-3 px-3 text-danger">${pos.stop_loss.toLocaleString()}</td>
                <td className={clsx('py-3 px-3 font-semibold', pnlUp ? 'text-success' : 'text-danger')}>
                  {pnlUp ? '+' : ''}${pos.unrealized_pnl_usdt.toFixed(2)}
                  <span className="text-tx-tertiary ml-1">
                    ({pnlUp ? '+' : ''}{pos.unrealized_pnl_pct.toFixed(2)}%)
                  </span>
                </td>
                <td className="py-3 px-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:text-white hover:bg-danger/20"
                    onClick={() => closePosition(pos.id, markPrice)}
                  >
                    Close
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
