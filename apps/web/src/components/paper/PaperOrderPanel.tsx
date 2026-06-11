'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { usePaperTrading } from '@/hooks/usePaperTrading'
import { useMarket } from '@/hooks/useMarket'
import { clsx } from 'clsx'

export function PaperOrderPanel() {
  const { selectedSymbol, tickers } = useMarket()
  const { summary, openManual } = usePaperTrading()

  const [side, setSide] = useState<'long' | 'short'>('long')
  const [sizeUsdt, setSizeUsdt] = useState('500')
  const [targetPct, setTargetPct] = useState('3')
  const [stopPct, setStopPct] = useState('1.5')
  const [loading, setLoading] = useState(false)

  const ticker = tickers.find(t => t.symbol === selectedSymbol)
  const price = ticker?.last_price ?? 0

  const targetPrice = side === 'long'
    ? price * (1 + parseFloat(targetPct) / 100)
    : price * (1 - parseFloat(targetPct) / 100)

  const stopPrice = side === 'long'
    ? price * (1 - parseFloat(stopPct) / 100)
    : price * (1 + parseFloat(stopPct) / 100)

  const rr = parseFloat(targetPct) / parseFloat(stopPct)

  const handleOpen = async () => {
    if (!price) return
    setLoading(true)
    await openManual({
      symbol: selectedSymbol,
      side,
      sizeUsdt: parseFloat(sizeUsdt),
      entryPrice: price,
      targetPrice: parseFloat(targetPrice.toFixed(2)),
      stopLoss: parseFloat(stopPrice.toFixed(2)),
    })
    setLoading(false)
  }

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-tx-primary">Paper Order</h3>
        <div className="flex items-center gap-2">
          <Badge variant="brand" dot>Simulated</Badge>
          <span className="text-xs font-mono text-tx-secondary">
            ${(summary?.account.balance_usdt ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Long / Short */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-surface rounded-lg">
        {(['long', 'short'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={clsx(
              'py-2 rounded-md text-sm font-semibold transition-all',
              side === s
                ? s === 'long' ? 'bg-success text-surface' : 'bg-danger text-white'
                : 'text-tx-secondary hover:text-tx-primary'
            )}
          >
            {s === 'long' ? '↑ Long' : '↓ Short'}
          </button>
        ))}
      </div>

      {/* Current price */}
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-tx-tertiary">Mark Price</span>
        <span className="text-tx-primary font-semibold">
          ${price.toLocaleString()}
        </span>
      </div>

      {/* Size + percentages */}
      <div className="space-y-3">
        <Input
          label="Size (USDT)"
          type="number"
          value={sizeUsdt}
          onChange={e => setSizeUsdt(e.target.value)}
          suffix="USDT"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Target %"
            type="number"
            value={targetPct}
            onChange={e => setTargetPct(e.target.value)}
            suffix="%"
          />
          <Input
            label="Stop %"
            type="number"
            value={stopPct}
            onChange={e => setStopPct(e.target.value)}
            suffix="%"
          />
        </div>
      </div>

      {/* Price preview */}
      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
        <div className="card-elevated p-2 text-center">
          <div className="text-tx-tertiary mb-0.5">Entry</div>
          <div className="text-tx-primary">${price.toLocaleString()}</div>
        </div>
        <div className="card-elevated p-2 text-center">
          <div className="text-tx-tertiary mb-0.5">Target</div>
          <div className="text-success">${targetPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </div>
        <div className="card-elevated p-2 text-center">
          <div className="text-tx-tertiary mb-0.5">Stop</div>
          <div className="text-danger">${stopPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-mono text-tx-tertiary">
        <span>R:R</span>
        <span className={rr >= 1.5 ? 'text-success' : 'text-warning'}>{rr.toFixed(2)}x</span>
      </div>

      <Button
        className="w-full"
        variant={side === 'long' ? 'primary' : 'danger'}
        loading={loading}
        disabled={!price || parseFloat(sizeUsdt) <= 0}
        onClick={handleOpen}
      >
        {side === 'long' ? '↑ Open Long' : '↓ Open Short'} (Paper)
      </Button>
    </div>
  )
}
