'use client'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { EquityPoint } from '@/types/advanced'

interface Props { data: EquityPoint[]; height?: number }

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const up = d.cumulative_pnl_pct >= 0
  return (
    <div className="card px-3 py-2 text-xs font-mono shadow-xl min-w-[140px]">
      <div className="text-tx-secondary mb-1">{d.date}</div>
      <div className={`font-semibold ${up ? 'text-success' : 'text-danger'}`}>
        {d.cumulative_pnl_pct >= 0 ? '+' : ''}{d.cumulative_pnl_pct.toFixed(3)}%
      </div>
    </div>
  )
}

export function EquityCurveChart({ data, height = 200 }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-tx-tertiary text-sm font-mono" style={{ height }}>
        No resolved signals yet
      </div>
    )
  }

  const isProfit = (data[data.length - 1]?.cumulative_pnl_pct ?? 0) >= 0
  const color = isProfit ? 'var(--success)' : 'var(--danger)'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'DM Mono' }}
          axisLine={false} tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
          tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'DM Mono' }}
          axisLine={false} tickLine={false}
          width={56} orientation="right"
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--surface-border-bright)' }} />
        <ReferenceLine y={0} stroke="var(--surface-border-bright)" strokeDasharray="4 4" />
        <Area
          type="monotone"
          dataKey="cumulative_pnl_pct"
          stroke={color}
          strokeWidth={1.5}
          fill="url(#equityGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
