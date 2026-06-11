'use client'
import { useState } from 'react'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useMarket } from '@/hooks/useMarket'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { clsx } from 'clsx'

const TOP_SYMBOLS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ADAUSDT','DOTUSDT','LINKUSDT']

export function WatchlistPanel() {
  const { items, add, remove, setAlerts, isWatched } = useWatchlist()
  const { tickers, setSelectedSymbol } = useMarket()
  const [editingAlerts, setEditingAlerts] = useState<string | null>(null)
  const [alertAbove, setAlertAbove] = useState('')
  const [alertBelow, setAlertBelow] = useState('')

  const handleSaveAlerts = async (symbol: string) => {
    await setAlerts(
      symbol,
      alertAbove ? parseFloat(alertAbove) : null,
      alertBelow ? parseFloat(alertBelow) : null
    )
    setEditingAlerts(null)
    setAlertAbove('')
    setAlertBelow('')
  }

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-tx-primary">Watchlist</h3>
        <Badge variant="neutral">{items.length} symbols</Badge>
      </div>

      {/* Quick-add from top symbols */}
      <div className="flex flex-wrap gap-1">
        {TOP_SYMBOLS.map(sym => {
          const watched = isWatched(sym)
          return (
            <button
              key={sym}
              onClick={() => watched ? remove(sym) : add(sym)}
              className={clsx(
                'px-2 py-1 rounded-lg text-[11px] font-mono border transition-all',
                watched
                  ? 'border-brand/40 bg-brand/10 text-brand'
                  : 'border-surface-border text-tx-tertiary hover:border-surface-border-bright hover:text-tx-secondary'
              )}
            >
              {sym.replace('USDT', '')}
              {watched && <span className="ml-1">✓</span>}
            </button>
          )
        })}
      </div>

      {/* Watched items */}
      {items.length === 0 ? (
        <p className="text-xs font-mono text-tx-tertiary text-center py-4">
          Add symbols above to start watching
        </p>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const ticker = tickers.find(t => t.symbol === item.symbol)
            const price = ticker?.last_price
            const change = ticker?.change_24h
            const isUp = (change ?? 0) >= 0
            const hitAbove = item.price_alert_above && price && price >= item.price_alert_above
            const hitBelow = item.price_alert_below && price && price <= item.price_alert_below

            return (
              <div key={item.id} className="space-y-2">
                <div
                  className="flex items-center justify-between p-2.5 rounded-lg bg-surface-elevated hover:bg-surface-border/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedSymbol(item.symbol)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm text-tx-primary">
                      {item.symbol.replace('USDT', '')}
                    </span>
                    {(hitAbove || hitBelow) && (
                      <Badge variant="warning" dot>Alert</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-mono text-tx-primary">
                        {price ? `$${price.toLocaleString()}` : '—'}
                      </div>
                      <div className={clsx('text-[10px] font-mono', isUp ? 'text-success' : 'text-danger')}>
                        {change != null ? `${isUp ? '+' : ''}${change.toFixed(2)}%` : ''}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); setEditingAlerts(editingAlerts === item.symbol ? null : item.symbol) }}
                        className="text-tx-tertiary hover:text-warning text-xs p-1 transition-colors"
                        title="Set price alerts"
                      >
                        🔔
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); remove(item.symbol) }}
                        className="text-tx-tertiary hover:text-danger text-xs p-1 transition-colors"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>

                {/* Alert editor */}
                {editingAlerts === item.symbol && (
                  <div className="ml-2 p-3 rounded-lg border border-surface-border-bright space-y-2 animate-slide-up">
                    <p className="text-[10px] font-mono text-tx-tertiary uppercase tracking-widest">Price Alerts</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Alert above"
                        type="number"
                        placeholder={item.price_alert_above?.toString() ?? '0'}
                        value={alertAbove}
                        onChange={e => setAlertAbove(e.target.value)}
                        suffix="$"
                      />
                      <Input
                        label="Alert below"
                        type="number"
                        placeholder={item.price_alert_below?.toString() ?? '0'}
                        value={alertBelow}
                        onChange={e => setAlertBelow(e.target.value)}
                        suffix="$"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveAlerts(item.symbol)} className="flex-1">
                        Save Alerts
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingAlerts(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
