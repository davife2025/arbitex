'use client'
import { useMarket } from '@/hooks/useMarket'
import { NotificationBell } from '@/components/NotificationBell'
import { clsx } from 'clsx'

export function TickerBar() {
  const { tickers, selectedSymbol, setSelectedSymbol } = useMarket()

  return (
    <div className="h-9 border-b border-surface-border flex items-center justify-between">
      {/* Scrollable tickers */}
      <div className="flex items-center overflow-x-auto scrollbar-none flex-1 h-full">
        {!tickers.length ? (
          <span className="px-3 text-xs font-mono text-tx-tertiary animate-pulse-brand">Loading...</span>
        ) : tickers.slice(0, 10).map(t => {
          const isUp = t.change_24h >= 0
          const isSelected = t.symbol === selectedSymbol
          return (
            <button key={t.symbol} onClick={() => setSelectedSymbol(t.symbol)}
              className={clsx(
                'flex items-center gap-1.5 px-3 h-full text-xs font-mono whitespace-nowrap',
                'transition-colors border-b-2 flex-shrink-0',
                isSelected
                  ? 'border-brand text-tx-primary bg-brand/5'
                  : 'border-transparent text-tx-secondary hover:text-tx-primary hover:bg-surface-card'
              )}>
              <span className="font-semibold">{t.symbol.replace('USDT', '')}</span>
              <span className="text-tx-tertiary hidden xs:inline">${t.last_price.toLocaleString()}</span>
              <span className={isUp ? 'text-success' : 'text-danger'}>
                {isUp ? '+' : ''}{t.change_24h.toFixed(2)}%
              </span>
            </button>
          )
        })}
      </div>

      {/* Notification bell — right side */}
      <div className="pr-2 flex-shrink-0">
        <NotificationBell />
      </div>
    </div>
  )
}
