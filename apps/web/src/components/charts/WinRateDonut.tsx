'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  wins: number
  losses: number
  expired: number
  size?: number
}

const COLORS = {
  win:     'var(--success)',
  loss:    'var(--danger)',
  expired: 'var(--text-tertiary)',
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs font-mono shadow-xl">
      <span className="capitalize">{payload[0].name}</span>: <strong>{payload[0].value}</strong>
    </div>
  )
}

export function WinRateDonut({ wins, losses, expired, size = 160 }: Props) {
  const total = wins + losses + expired
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '—'

  const data = [
    { name: 'win', value: wins },
    { name: 'loss', value: losses },
    { name: 'expired', value: expired },
  ].filter(d => d.value > 0)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-tx-tertiary text-sm font-mono" style={{ height: size }}>
        No data
      </div>
    )
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.32}
            outerRadius={size * 0.46}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-mono font-bold text-tx-primary">{winRate}%</span>
        <span className="text-xs font-mono text-tx-tertiary">Win Rate</span>
      </div>
    </div>
  )
}
