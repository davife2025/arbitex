'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useMarket } from '@/hooks/useMarket'
import { clsx } from 'clsx'

export function OrderPanel() {
  const { selectedSymbol } = useMarket()
  const { placeOrder } = usePortfolio()

  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [type, setType] = useState<'market' | 'limit'>('market')
  const [size, setSize] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const handleSubmit = async () => {
    if (!size || parseFloat(size) <= 0) return
    setLoading(true)
    setResult(null)
    try {
      const res = await placeOrder({
        symbol: selectedSymbol,
        side,
        type,
        size: parseFloat(size),
        price: type === 'limit' && price ? parseFloat(price) : undefined,
      })
      if (res.success) {
        setResult({ ok: true, msg: `Order placed — ID: ${res.data?.orderId ?? ''}` })
        setSize('')
        setPrice('')
      } else {
        setResult({ ok: false, msg: res.error ?? 'Order failed' })
      }
    } catch (err: any) {
      setResult({ ok: false, msg: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-tx-primary">Place Order</h3>
        <span className="text-xs font-mono text-brand">{selectedSymbol}</span>
      </div>

      {/* Buy / Sell toggle */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-surface rounded-lg">
        {(['buy', 'sell'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={clsx(
              'py-2 rounded-md text-sm font-semibold transition-all',
              side === s
                ? s === 'buy'
                  ? 'bg-success text-surface'
                  : 'bg-danger text-white'
                : 'text-tx-secondary hover:text-tx-primary'
            )}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Market / Limit toggle */}
      <div className="flex gap-2">
        {(['market', 'limit'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={clsx(
              'px-3 py-1 rounded-lg text-xs font-mono transition-all border',
              type === t
                ? 'border-brand/40 text-brand bg-brand/5'
                : 'border-surface-border text-tx-tertiary hover:text-tx-secondary'
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="space-y-3">
        {type === 'limit' && (
          <Input label="Price" type="number" placeholder="0.00" suffix="USDT" value={price} onChange={(e) => setPrice(e.target.value)} />
        )}
        <Input label="Size" type="number" placeholder="0.00" suffix={selectedSymbol.replace('USDT', '')} value={size} onChange={(e) => setSize(e.target.value)} />
      </div>

      {/* Submit */}
      <Button
        variant={side === 'buy' ? 'primary' : 'danger'}
        className="w-full"
        loading={loading}
        onClick={handleSubmit}
        disabled={!size}
      >
        {side === 'buy' ? '↑ Buy' : '↓ Sell'} {selectedSymbol}
      </Button>

      {/* Result */}
      {result && (
        <div className={clsx(
          'text-xs font-mono px-3 py-2 rounded-lg',
          result.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
        )}>
          {result.msg}
        </div>
      )}
    </div>
  )
}
