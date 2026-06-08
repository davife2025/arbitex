'use client'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import type { Candle } from '@arbitex/types'

interface CandleChartProps {
  candles: Candle[]
  height?: number
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const c = payload[0]?.payload
  if (!c) return null
  const isGreen = c.close >= c.open

  return (
    <div className="card p-3 text-xs font-mono space-y-1 shadow-xl min-w-[160px]">
      <div className="text-tx-secondary mb-2">{new Date(c.timestamp).toLocaleString()}</div>
      <div className="flex justify-between gap-4">
        <span className="text-tx-tertiary">O</span>
        <span className={isGreen ? 'text-success' : 'text-danger'}>{c.open.toFixed(2)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-tx-tertiary">H</span>
        <span className="text-tx-primary">{c.high.toFixed(2)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-tx-tertiary">L</span>
        <span className="text-tx-primary">{c.low.toFixed(2)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-tx-tertiary">C</span>
        <span className={isGreen ? 'text-success' : 'text-danger'}>{c.close.toFixed(2)}</span>
      </div>
      <div className="flex justify-between gap-4 pt-1 border-t border-surface-border">
        <span className="text-tx-tertiary">Vol</span>
        <span className="text-tx-secondary">{c.volume.toFixed(0)}</span>
      </div>
    </div>
  )
}

export function CandleChart({ candles, height = 320 }: CandleChartProps) {
  if (!candles.length) {
    return (
      <div className="flex items-center justify-center h-[320px] text-tx-tertiary text-sm font-mono">
        No candle data
      </div>
    )
  }

  // Recharts doesn't have a native candlestick — use Bar with custom shape
  const data = candles.slice(-80).map((c) => ({
    ...c,
    // Bar from open to close
    barLow: Math.min(c.open, c.close),
    barHigh: Math.abs(c.close - c.open),
    // Wick data as error bar concept
    wickLow: c.low,
    wickHigh: c.high,
    isGreen: c.close >= c.open,
  }))

  const prices = candles.flatMap((c) => [c.low, c.high])
  const yMin = Math.min(...prices) * 0.9995
  const yMax = Math.max(...prices) * 1.0005

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="timestamp"
          tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'DM Mono' }}
          axisLine={{ stroke: 'var(--surface-border)' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[yMin, yMax]}
          tickFormatter={(v) => v.toFixed(0)}
          tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'DM Mono' }}
          axisLine={false}
          tickLine={false}
          width={56}
          orientation="right"
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--surface-border-bright)', strokeWidth: 1 }} />

        {/* Wick lines via Line */}
        <Line
          dataKey="wickHigh"
          stroke="transparent"
          dot={false}
          activeDot={false}
        />

        {/* Candle bodies */}
        <Bar dataKey="barHigh" stackId="candle" fill="transparent">
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.isGreen ? 'var(--success)' : 'var(--danger)'}
              opacity={0.9}
            />
          ))}
        </Bar>

        {/* Close price line */}
        <Line
          dataKey="close"
          stroke="var(--brand)"
          strokeWidth={1}
          dot={false}
          opacity={0.4}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
