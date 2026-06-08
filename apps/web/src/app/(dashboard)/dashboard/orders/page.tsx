'use client'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useMarket } from '@/hooks/useMarket'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { OrderPanel } from '@/components/trading/OrderPanel'
import { formatPrice } from '@arbitex/utils'
import type { Order } from '@arbitex/types'

const statusVariant: Record<string, 'success' | 'danger' | 'warning' | 'neutral' | 'brand'> = {
  open: 'brand',
  filled: 'success',
  cancelled: 'neutral',
  failed: 'danger',
  pending: 'warning',
}

export default function OrdersPage() {
  const { orders, cancelOrder } = usePortfolio()
  const { selectedSymbol } = useMarket()

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-tx-primary">Orders</h1>
        <p className="text-xs font-mono text-tx-tertiary mt-0.5">Live order management via Bitget</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">

        {/* Orders table */}
        <div className="card">
          <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-tx-primary">Order History</h2>
            <Badge variant="neutral">{orders.length} orders</Badge>
          </div>

          {orders.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-tx-tertiary text-sm font-mono">
              No orders yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-surface-border">
                    {['Symbol', 'Side', 'Type', 'Size', 'Price', 'Status', 'Time', ''].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-tx-tertiary uppercase tracking-wider font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: Order) => (
                    <tr key={order.id} className="border-b border-surface-border/50 hover:bg-surface-card/50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-tx-primary">{order.symbol}</td>
                      <td className="py-3 px-3">
                        <Badge variant={order.side === 'buy' ? 'success' : 'danger'}>
                          {order.side.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-tx-secondary capitalize">{order.type}</td>
                      <td className="py-3 px-3 text-tx-primary">{order.size}</td>
                      <td className="py-3 px-3 text-tx-secondary">
                        {order.price ? `$${formatPrice(order.price)}` : 'Market'}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={statusVariant[order.status] ?? 'neutral'}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-tx-tertiary">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3">
                        {order.status === 'open' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelOrder(order.id, order.symbol)}
                            className="text-danger hover:text-danger"
                          >
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order panel */}
        <OrderPanel />
      </div>
    </div>
  )
}
