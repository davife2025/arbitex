'use client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface DataPoint { time: string; value: number }

interface PortfolioChartProps {
  data: DataPoint[]
  height?: number
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs font-mono shadow-xl">
      <div className="text-tx-secondary mb-1">{payload[0].payload.time}</div>
      <div className="text-brand font-semibold">${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
    </div>
  )
}

export function PortfolioChart({ data, height = 160 }: PortfolioChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-tx-tertiary text-sm font-mono" style={{ height }}>
        No data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" hide />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--surface-border-bright)' }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--brand)"
          strokeWidth={1.5}
          fill="url(#portfolioGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
