'use client'
import { useMarket } from '@/hooks/useMarket'
import { clsx } from 'clsx'

export function TickerBar() {
  const { tickers, selectedSymbol, setSelectedSymbol } = useMarket()

  if (!tickers.length) {
    return (
      <div className="h-10 border-b border-surface-border flex items-center px-4">
        <span className="text-xs font-mono text-tx-tertiary animate-pulse-brand">Loading tickers...</span>
      </div>
    )
  }

  return (
    <div className="h-10 border-b border-surface-border flex items-center gap-0 overflow-x-auto scrollbar-none">
      {tickers.slice(0, 10).map((t) => {
        const isUp = t.change_24h >= 0
        const isSelected = t.symbol === selectedSymbol
        return (
          <button
            key={t.symbol}
            onClick={() => setSelectedSymbol(t.symbol)}
            className={clsx(
              'flex items-center gap-2 px-4 h-full text-xs font-mono whitespace-nowrap transition-colors border-b-2',
              isSelected
                ? 'border-brand text-tx-primary bg-brand/5'
                : 'border-transparent text-tx-secondary hover:text-tx-primary hover:bg-surface-card'
            )}
          >
            <span className="font-semibold">{t.symbol.replace('USDT', '')}</span>
            <span className="text-tx-tertiary">${t.last_price.toLocaleString()}</span>
            <span className={isUp ? 'text-success' : 'text-danger'}>
              {isUp ? '+' : ''}{t.change_24h.toFixed(2)}%
            </span>
          </button>
        )
      })}
    </div>
  )
}
