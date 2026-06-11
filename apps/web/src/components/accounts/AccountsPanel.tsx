'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import { clsx } from 'clsx'
import type { TradingAccount } from '@/types/advanced'
import type { ApiResponse } from '@arbitex/types'

const DEMO_USER_ID = 'demo-user'

const LABEL_COLORS = ['#00E5FF','#00C48C','#FFB800','#FF4757','#A855F7','#F97316']

export function AccountsPanel() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', apiKey: '', apiSecret: '', passphrase: '',
    labelColor: '#00E5FF', note: '', makeDefault: false,
  })
  const [saving, setSaving] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<TradingAccount[]>>(
        `/api/accounts/${DEMO_USER_ID}`
      )
      if (res.success && res.data) setAccounts(res.data)
    } catch (err) {
      console.error('fetchAccounts error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleAdd = async () => {
    if (!form.name || !form.apiKey || !form.apiSecret || !form.passphrase) {
      return toast.error('Name, API key, secret, and passphrase are required')
    }
    setSaving(true)
    try {
      const res = await api.post<ApiResponse<TradingAccount>>('/api/accounts', {
        user_id: DEMO_USER_ID,
        name: form.name,
        api_key: form.apiKey,
        api_secret: form.apiSecret,
        passphrase: form.passphrase,
        label_color: form.labelColor,
        note: form.note || undefined,
        make_default: form.makeDefault,
      })
      if (res.success && res.data) {
        setAccounts(prev => [...prev, res.data!])
        setShowForm(false)
        setForm({ name: '', apiKey: '', apiSecret: '', passphrase: '', labelColor: '#00E5FF', note: '', makeDefault: false })
        toast.success(`Account "${res.data.name}" added`)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (id: string) => {
    setTesting(id)
    try {
      const res = await api.post<ApiResponse<any>>(`/api/accounts/${DEMO_USER_ID}/${id}/test`, {})
      if (res.success && res.data?.success) {
        toast.success(`Connection successful — ${res.data.balances?.length ?? 0} assets found`)
      } else {
        toast.error(res.data?.error ?? 'Connection failed')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setTesting(null)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await api.post(`/api/accounts/${DEMO_USER_ID}/${id}/set-default`, {})
      setAccounts(prev => prev.map(a => ({ ...a, is_default: a.id === id })))
      toast.success('Default account updated')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    try {
      await api.delete(`/api/accounts/${DEMO_USER_ID}/${id}`)
      setAccounts(prev => prev.filter(a => a.id !== id))
      toast.success(`"${name}" removed`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-tx-primary">Trading Accounts</h2>
        <Button size="sm" variant="secondary" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ Add Account'}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card p-4 space-y-3 border-brand/20 animate-slide-up">
          <p className="text-xs font-mono text-brand uppercase tracking-widest">New Bitget Account</p>
          <Input label="Account Name" placeholder="Main Account" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="API Key" type="password" placeholder="your-api-key"
            value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} />
          <Input label="API Secret" type="password" placeholder="your-api-secret"
            value={form.apiSecret} onChange={e => setForm(f => ({ ...f, apiSecret: e.target.value }))} />
          <Input label="Passphrase" type="password" placeholder="your-passphrase"
            value={form.passphrase} onChange={e => setForm(f => ({ ...f, passphrase: e.target.value }))} />
          <Input label="Note (optional)" placeholder="e.g. Futures only"
            value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />

          {/* Label color */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-tx-secondary uppercase tracking-widest">Label Color</label>
            <div className="flex gap-2">
              {LABEL_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, labelColor: c }))}
                  className={clsx('w-6 h-6 rounded-full border-2 transition-all',
                    form.labelColor === c ? 'border-white scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.makeDefault}
              onChange={e => setForm(f => ({ ...f, makeDefault: e.target.checked }))}
              className="accent-brand" />
            <span className="text-sm text-tx-secondary">Set as default account</span>
          </label>

          <Button className="w-full" loading={saving} onClick={handleAdd}>
            Add Account
          </Button>

          <p className="text-[10px] font-mono text-tx-tertiary text-center">
            API keys are encrypted with AES-256-GCM before storage
          </p>
        </div>
      )}

      {/* Account list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2].map(i => (
            <div key={i} className="card p-4 animate-pulse space-y-2">
              <div className="h-4 w-32 bg-surface-elevated rounded" />
              <div className="h-3 w-48 bg-surface-elevated rounded" />
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <p className="text-tx-tertiary text-sm font-mono">No trading accounts</p>
          <p className="text-xs font-mono text-tx-tertiary">
            Add your Bitget API keys to connect an account
          </p>
          <Button size="sm" className="mx-auto mt-2" onClick={() => setShowForm(true)}>
            Connect Account
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(account => (
            <div key={account.id}
              className={clsx('card p-4 space-y-3 transition-all',
                account.is_default && 'border-brand/30'
              )}>
              {/* Account header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: account.label_color }} />
                  <span className="font-semibold text-sm text-tx-primary">{account.name}</span>
                  {account.is_default && <Badge variant="brand" dot>Default</Badge>}
                  {!account.is_active && <Badge variant="neutral">Inactive</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost"
                    loading={testing === account.id}
                    onClick={() => handleTest(account.id)}
                    className="text-xs px-2">
                    Test
                  </Button>
                  {!account.is_default && (
                    <Button size="sm" variant="ghost"
                      onClick={() => handleSetDefault(account.id)}
                      className="text-xs px-2 text-tx-tertiary">
                      Set Default
                    </Button>
                  )}
                  <Button size="sm" variant="ghost"
                    onClick={() => handleDelete(account.id, account.name)}
                    className="text-danger hover:text-danger px-2">
                    ✕
                  </Button>
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs font-mono text-tx-tertiary">
                <span className="capitalize">{account.exchange}</span>
                {account.last_synced_at && (
                  <span>Synced {new Date(account.last_synced_at).toLocaleTimeString()}</span>
                )}
                {account.note && <span className="text-tx-tertiary">· {account.note}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security note */}
      <div className="card-elevated p-3 text-xs font-mono text-tx-tertiary space-y-1">
        <p className="text-tx-secondary font-semibold">🔐 Security</p>
        <p>All API keys are encrypted with AES-256-GCM before storage.</p>
        <p>Keys are never returned in API responses — only used server-side.</p>
        <p>Use read-only + trade permissions only. Never enable withdrawals.</p>
      </div>
    </div>
  )
}
