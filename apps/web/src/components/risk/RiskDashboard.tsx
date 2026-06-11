'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import { clsx } from 'clsx'

const DEMO_USER_ID = 'demo-user'

interface RiskProfile {
  daily_loss_limit_pct: number
  circuit_breaker_enabled: boolean
  circuit_breaker_triggered: boolean
  max_open_positions: number
  max_position_size_pct: number
  max_drawdown_pct: number
  drawdown_alert_pct: number
  pause_on_high_volatility: boolean
  volatility_threshold_pct: number
}

interface RiskDashboardData {
  profile: RiskProfile
  today_pnl: any
  risk_score: number
  alerts: string[]
}

function RiskMeter({ score }: { score: number }) {
  const color = score >= 75 ? 'var(--danger)' : score >= 40 ? 'var(--warning)' : 'var(--success)'
  const label = score >= 75 ? 'High Risk' : score >= 40 ? 'Moderate' : 'Low Risk'
  const variant = score >= 75 ? 'danger' : score >= 40 ? 'warning' : 'success'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-tx-tertiary">Risk Score</span>
        <Badge variant={variant as any}>{label}</Badge>
      </div>
      <div className="relative h-3 rounded-full bg-surface-elevated overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
      <div className="text-right text-xs font-mono text-tx-tertiary">{score}/100</div>
    </div>
  )
}

export function RiskDashboard({ equity = 10000 }: { equity?: number }) {
  const [data, setData] = useState<RiskDashboardData | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    daily_loss_limit_pct: '5',
    max_open_positions: '5',
    max_position_size_pct: '10',
    max_drawdown_pct: '20',
    circuit_breaker_enabled: true,
  })

  const fetch = useCallback(async () => {
    try {
      const res = await api.get<any>(`/api/risk/dashboard/${DEMO_USER_ID}?equity=${equity}`)
      if (res.success && res.data) {
        setData(res.data)
        const p = res.data.profile
        setForm({
          daily_loss_limit_pct: String(p.daily_loss_limit_pct),
          max_open_positions: String(p.max_open_positions),
          max_position_size_pct: String(p.max_position_size_pct),
          max_drawdown_pct: String(p.max_drawdown_pct),
          circuit_breaker_enabled: p.circuit_breaker_enabled,
        })
      }
    } catch {}
  }, [equity])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post(`/api/risk/profile/${DEMO_USER_ID}`, {
        daily_loss_limit_pct: parseFloat(form.daily_loss_limit_pct),
        max_open_positions: parseInt(form.max_open_positions),
        max_position_size_pct: parseFloat(form.max_position_size_pct),
        max_drawdown_pct: parseFloat(form.max_drawdown_pct),
        circuit_breaker_enabled: form.circuit_breaker_enabled,
      })
      toast.success('Risk profile saved')
      setEditing(false)
      await fetch()
    } catch { toast.error('Failed to save') } finally { setSaving(false) }
  }

  const handleResetBreaker = async () => {
    await api.post(`/api/risk/reset-circuit-breaker/${DEMO_USER_ID}`, {})
    toast.success('Circuit breaker reset')
    await fetch()
  }

  useEffect(() => { fetch() }, [fetch])

  if (!data) return (
    <div className="card p-4 animate-pulse space-y-3">
      <div className="h-4 w-32 bg-surface-elevated rounded" />
      <div className="h-3 w-full bg-surface-elevated rounded" />
      <div className="h-3 w-3/4 bg-surface-elevated rounded" />
    </div>
  )

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-tx-primary">🛡 Risk Management</h3>
        <Button size="sm" variant="ghost" onClick={() => setEditing(e => !e)}>
          {editing ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      {/* Risk meter */}
      <RiskMeter score={data.risk_score} />

      {/* Circuit breaker alert */}
      {data.profile.circuit_breaker_triggered && (
        <div className="flex items-center justify-between bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
          <span className="text-xs font-mono text-danger">🛑 Circuit breaker active</span>
          <Button size="sm" variant="danger" onClick={handleResetBreaker}>Reset</Button>
        </div>
      )}

      {/* Risk alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-1">
          {data.alerts.map((alert, i) => (
            <div key={i} className="text-xs font-mono text-warning bg-warning/10 px-3 py-1.5 rounded-lg">
              ⚠ {alert}
            </div>
          ))}
        </div>
      )}

      {/* Today P&L */}
      {data.today_pnl && (
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="card-elevated p-2">
            <div className="text-tx-tertiary mb-0.5">Today PnL</div>
            <div className={clsx('font-semibold', data.today_pnl.realized_pnl_usdt >= 0 ? 'text-success' : 'text-danger')}>
              {data.today_pnl.realized_pnl_usdt >= 0 ? '+' : ''}${Number(data.today_pnl.realized_pnl_usdt).toFixed(2)}
            </div>
          </div>
          <div className="card-elevated p-2">
            <div className="text-tx-tertiary mb-0.5">Loss Limit</div>
            <div className="text-tx-secondary">{data.profile.daily_loss_limit_pct}% / day</div>
          </div>
        </div>
      )}

      {/* Limits display or edit form */}
      {editing ? (
        <div className="space-y-3 pt-2 border-t border-surface-border">
          <Input label="Daily loss limit (%)" type="number" value={form.daily_loss_limit_pct}
            onChange={e => setForm(f => ({ ...f, daily_loss_limit_pct: e.target.value }))} suffix="%" />
          <Input label="Max open positions" type="number" value={form.max_open_positions}
            onChange={e => setForm(f => ({ ...f, max_open_positions: e.target.value }))} />
          <Input label="Max position size (%)" type="number" value={form.max_position_size_pct}
            onChange={e => setForm(f => ({ ...f, max_position_size_pct: e.target.value }))} suffix="%" />
          <Input label="Max drawdown (%)" type="number" value={form.max_drawdown_pct}
            onChange={e => setForm(f => ({ ...f, max_drawdown_pct: e.target.value }))} suffix="%" />
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-tx-secondary">Circuit breaker</span>
            <button
              onClick={() => setForm(f => ({ ...f, circuit_breaker_enabled: !f.circuit_breaker_enabled }))}
              className={clsx('relative w-9 h-5 rounded-full transition-colors',
                form.circuit_breaker_enabled ? 'bg-brand' : 'bg-surface-border')}
            >
              <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                form.circuit_breaker_enabled ? 'left-4' : 'left-0.5')} />
            </button>
          </label>
          <Button className="w-full" loading={saving} onClick={handleSave}>Save Limits</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-surface-border">
          {[
            { label: 'Max Positions', value: data.profile.max_open_positions },
            { label: 'Max Size', value: `${data.profile.max_position_size_pct}%` },
            { label: 'Max Drawdown', value: `${data.profile.max_drawdown_pct}%` },
            { label: 'Circuit Breaker', value: data.profile.circuit_breaker_enabled ? '✓ On' : '✕ Off' },
          ].map(s => (
            <div key={s.label} className="card-elevated p-2">
              <div className="text-tx-tertiary mb-0.5">{s.label}</div>
              <div className="text-tx-secondary font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
