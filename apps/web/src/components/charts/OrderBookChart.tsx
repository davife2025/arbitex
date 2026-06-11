'use client'
import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { clsx } from 'clsx'
import type { OrderBook, OrderBookLevel } from '@/types/advanced'
import type { ApiResponse } from '@arbitex/types'

interface Props { symbol: string; depth?: number; refreshMs?: number }

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="card px-3 py-2 text-xs font-mono shadow-xl">
      <div className="text-tx-tertiary mb-0.5">{d.side === 'bid' ? 'Bid' : 'Ask'}</div>
      <div className="text-tx-primary">Price: <span className={d.side === 'bid' ? 'text-success' : 'text-danger'}>${d.price.toLocaleString()}</span></div>
      <div className="text-tx-secondary">Size: {d.size.toFixed(4)}</div>
      <div className="text-tx-secondary">Total: {d.total.toFixed(4)}</div>
    </div>
  )
}

function ImbalanceBar({ imbalance }: { imbalance: number }) {
  const bidPct = ((imbalance + 1) / 2) * 100
  const label = imbalance > 0.1 ? 'Bid heavy' : imbalance < -0.1 ? 'Ask heavy' : 'Balanced'
  const variant = imbalance > 0.1 ? 'success' : imbalance < -0.1 ? 'danger' : 'neutral'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-danger">Asks</span>
        <Badge variant={variant as any}>{label}</Badge>
        <span className="text-success">Bids</span>
      </div>
      <div className="relative h-2 rounded-full bg-danger/30 overflow-hidden">
        <div
          className="absolute top-0 bottom-0 left-0 rounded-full bg-success transition-all duration-500"
          style={{ width: `${Math.max(2, bidPct)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-tx-tertiary">
        <span>Imbalance: {imbalance.toFixed(3)}</span>
        <span>{bidPct.toFixed(1)}% bids</span>
      </div>
    </div>
  )
}

export function OrderBookChart({ symbol, depth = 15, refreshMs = 3000 }: Props) {
  const [book, setBook] = useState<OrderBook | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'chart' | 'ladder'>('ladder')

  const fetchBook = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<OrderBook>>(
        `/api/orderbook/${symbol}?depth=${depth}`
      )
      if (res.success && res.data) setBook(res.data)
    } catch (err) {
      console.error('OrderBook fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [symbol, depth])

  useEffect(() => {
    fetchBook()
    const interval = setInterval(fetchBook, refreshMs)
    return () => clearInterval(interval)
  }, [fetchBook, refreshMs])

  useEffect(() => {
    setLoading(true)
    setBook(null)
  }, [symbol])

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-6 rounded bg-surface-elevated" />
        ))}
      </div>
    )
  }

  if (!book) {
    return (
      <div className="flex items-center justify-center py-8 text-tx-tertiary text-xs font-mono">
        No order book data
      </div>
    )
  }

  // Prepare chart data — mirror bids left, asks right
  const topBids = book.bids.slice(0, 10)
  const topAsks = book.asks.slice(0, 10)

  const chartData = [
    ...topBids.map(b => ({ ...b, side: 'bid', value: b.depth_pct })).reverse(),
    ...topAsks.map(a => ({ ...a, side: 'ask', value: a.depth_pct })),
  ]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-tx-secondary">
            Spread: <span className="text-tx-primary">${book.spread.toFixed(2)}</span>
            <span className="text-tx-tertiary ml-1">({book.spread_pct.toFixed(4)}%)</span>
          </span>
        </div>
        <div className="flex gap-1">
          {(['ladder', 'chart'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={clsx('px-2 py-0.5 rounded text-[10px] font-mono border transition-all capitalize',
                view === v ? 'border-brand/40 bg-brand/5 text-brand' : 'border-surface-border text-tx-tertiary'
              )}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Imbalance bar */}
      <ImbalanceBar imbalance={book.imbalance} />

      {view === 'ladder' ? (
        /* Price ladder */
        <div className="space-y-0">
          {/* Asks — reversed (lowest ask at bottom near mid) */}
          <div className="space-y-0">
            {[...topAsks].reverse().map((level, i) => (
              <div key={`ask-${i}`} className="relative flex items-center justify-between px-2 py-0.5 group">
                <div
                  className="absolute right-0 top-0 bottom-0 bg-danger/10 transition-all"
                  style={{ width: `${level.depth_pct}%` }}
                />
                <span className="relative text-[11px] font-mono text-danger z-10">
                  {level.size.toFixed(4)}
                </span>
                <span className="relative text-[11px] font-mono text-danger font-semibold z-10">
                  ${level.price.toLocaleString()}
                </span>
                <span className="relative text-[11px] font-mono text-tx-tertiary z-10">
                  {level.total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Mid price */}
          <div className="flex items-center justify-center py-1 border-y border-surface-border-bright my-0.5">
            <span className="text-xs font-mono font-bold text-tx-primary">
              ${book.mid_price.toLocaleString()}
            </span>
          </div>

          {/* Bids */}
          <div className="space-y-0">
            {topBids.map((level, i) => (
              <div key={`bid-${i}`} className="relative flex items-center justify-between px-2 py-0.5 group">
                <div
                  className="absolute left-0 top-0 bottom-0 bg-success/10 transition-all"
                  style={{ width: `${level.depth_pct}%` }}
                />
                <span className="relative text-[11px] font-mono text-success z-10">
                  {level.size.toFixed(4)}
                </span>
                <span className="relative text-[11px] font-mono text-success font-semibold z-10">
                  ${level.price.toLocaleString()}
                </span>
                <span className="relative text-[11px] font-mono text-tx-tertiary z-10">
                  {level.total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Depth chart */
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="price" hide />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="value" radius={[2,2,0,0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.side === 'bid' ? 'var(--success)' : 'var(--danger)'} opacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Depth totals */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-surface-border">
        <div className="text-center">
          <div className="text-tx-tertiary">Bid Depth</div>
          <div className="text-success font-semibold">${book.bid_depth.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="text-center">
          <div className="text-tx-tertiary">Ask Depth</div>
          <div className="text-danger font-semibold">${book.ask_depth.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
        </div>
      </div>
    </div>
  )
}
