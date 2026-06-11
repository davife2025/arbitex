'use client'
import { useRateLimits } from '@/hooks/useRateLimits'
import { Badge } from '@/components/ui/Badge'
import { Stat } from '@/components/ui/Stat'
import { Button } from '@/components/ui/Button'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { clsx } from 'clsx'

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs font-mono shadow-xl">
      <div className="text-tx-secondary">{payload[0].payload.minute}</div>
      <div className="text-tx-primary">Requests: {payload[0].value}</div>
      {payload[1]?.value > 0 && <div className="text-danger">Errors: {payload[1].value}</div>}
    </div>
  )
}

export default function ApiHealthPage() {
  const { stats, quota, loading, fetchStats } = useRateLimits()

  const errorRateVariant = !stats ? 'neutral'
    : stats.error_rate_pct > 10 ? 'danger'
    : stats.error_rate_pct > 2 ? 'warning'
    : 'success'

  const rpmVariant = !quota ? 'neutral'
    : quota.warning ? 'warning' : 'success'

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-tx-primary">API Health</h1>
          <p className="text-xs font-mono text-tx-tertiary mt-0.5">
            Bitget quota · Request timeline · Endpoint performance
          </p>
        </div>
        <Button size="sm" variant="secondary" loading={loading} onClick={fetchStats}>
          ↺ Refresh
        </Button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <Stat label="Requests / Hour" value={stats?.requests_last_hour ?? '—'} mono />
        </div>
        <div className="card p-4">
          <Stat label="Requests / Min" value={stats?.requests_last_minute ?? '—'} mono />
        </div>
        <div className="card p-4">
          <Stat label="Avg Response" value={stats ? `${stats.avg_response_ms}ms` : '—'} mono />
        </div>
        <div className="card p-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono text-tx-secondary uppercase tracking-widest">Error Rate</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold text-tx-primary">
                {stats?.error_rate_pct.toFixed(1) ?? '—'}%
              </span>
              <Badge variant={errorRateVariant as any}>
                {errorRateVariant === 'success' ? 'OK' : errorRateVariant === 'warning' ? 'Watch' : 'High'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Bitget quota */}
      {quota && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-tx-primary">Bitget Rate Limits</h2>
            <Badge variant={rpmVariant as any} dot={quota.warning}>
              {quota.warning ? 'Near Limit' : 'Healthy'}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            {[
              { label: 'Public Limit', value: `${quota.public_limit_per_second}/s` },
              { label: 'Private Limit', value: `${quota.private_limit_per_second}/s` },
              { label: 'Est. Rate', value: `${quota.estimated_per_second}/s` },
              { label: 'Last Minute', value: `${quota.requests_last_minute} reqs` },
            ].map(s => (
              <div key={s.label} className="card-elevated p-2">
                <div className="text-tx-tertiary mb-0.5">{s.label}</div>
                <div className="text-tx-primary font-semibold">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Visual rate meter */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-tx-tertiary">
              <span>0</span>
              <span>Private limit: {quota.private_limit_per_second}/s</span>
            </div>
            <div className="relative h-2 rounded-full bg-surface-elevated overflow-hidden">
              <div
                className={clsx('absolute left-0 top-0 bottom-0 rounded-full transition-all',
                  quota.warning ? 'bg-warning' : 'bg-success'
                )}
                style={{ width: `${Math.min(100, (quota.estimated_per_second / quota.private_limit_per_second) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Request timeline */}
      {stats?.timeline && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-tx-primary mb-4">Request Timeline (30 min)</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.timeline} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="minute" tick={{ fontSize: 9, fill: 'var(--text-tertiary)', fontFamily: 'DM Mono' }}
                interval={4} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" radius={[2,2,0,0]}>
                {stats.timeline.map((entry, i) => (
                  <Cell key={i} fill={entry.errors > 0 ? 'var(--warning)' : 'var(--brand)'} opacity={0.7} />
                ))}
              </Bar>
              <Bar dataKey="errors" radius={[2,2,0,0]} fill="var(--danger)" opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-[10px] font-mono text-tx-tertiary">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-brand opacity-70 inline-block" />Requests</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-danger opacity-80 inline-block" />Errors</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-warning opacity-70 inline-block" />With errors</span>
          </div>
        </div>
      )}

      {/* Endpoint breakdown */}
      {stats?.by_endpoint && stats.by_endpoint.length > 0 && (
        <div className="card">
          <div className="px-4 py-3 border-b border-surface-border">
            <h2 className="text-sm font-semibold text-tx-primary">Endpoints (Last Hour)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-surface-border">
                  {['Endpoint','Calls','Avg Ms','Errors','Error Rate','Last Called'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-tx-tertiary font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.by_endpoint.map(ep => (
                  <tr key={ep.endpoint} className="border-b border-surface-border/40 hover:bg-surface-elevated/50 transition-colors">
                    <td className="py-2.5 px-3 text-tx-primary font-semibold truncate max-w-[200px]">{ep.endpoint}</td>
                    <td className="py-2.5 px-3 text-tx-secondary">{ep.count}</td>
                    <td className={clsx('py-2.5 px-3', ep.avg_ms > 2000 ? 'text-danger' : ep.avg_ms > 500 ? 'text-warning' : 'text-success')}>
                      {ep.avg_ms}ms
                    </td>
                    <td className="py-2.5 px-3 text-tx-secondary">{ep.error_count}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant={ep.error_rate_pct > 10 ? 'danger' : ep.error_rate_pct > 0 ? 'warning' : 'success'}>
                        {ep.error_rate_pct.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-tx-tertiary">
                      {new Date(ep.last_called).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
