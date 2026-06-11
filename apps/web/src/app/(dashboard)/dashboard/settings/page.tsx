'use client'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RiskDashboard } from '@/components/risk/RiskDashboard'
import { AccountsPanel } from '@/components/accounts/AccountsPanel'
import { api } from '@/lib/api'
import { toast } from '@/components/ui/Toast'
import { clsx } from 'clsx'

type Tab = 'accounts' | 'alerts' | 'risk'

function Toggle({ label, sub, checked, onChange }: {
  label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-2">
      <div>
        <span className="text-sm text-tx-secondary">{label}</span>
        {sub && <p className="text-xs font-mono text-tx-tertiary">{sub}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={clsx('relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
          checked ? 'bg-brand' : 'bg-surface-border')}>
        <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
          checked ? 'left-5' : 'left-0.5')} />
      </button>
    </label>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('accounts')
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [tgEnabled, setTgEnabled] = useState(false)
  const [tgChatId, setTgChatId] = useState('')
  const [notifyGenerated, setNotifyGenerated] = useState(true)
  const [notifyTriggered, setNotifyTriggered] = useState(true)
  const [notifyExpired, setNotifyExpired] = useState(false)
  const [notifyStop, setNotifyStop] = useState(true)
  const [notifyTarget, setNotifyTarget] = useState(true)
  const [minConf, setMinConf] = useState<'low'|'medium'|'high'>('medium')
  const [testingTg, setTestingTg] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [savingAlerts, setSavingAlerts] = useState(false)

  const handleTestTg = async () => {
    if (!tgChatId) return toast.error('Enter chat ID first')
    setTestingTg(true)
    try {
      const res = await api.post<any>('/api/alerts/test/telegram', { chat_id: tgChatId })
      res.success ? toast.success('Test message sent!') : toast.error('Failed')
    } catch { toast.error('Test failed') } finally { setTestingTg(false) }
  }

  const handleTestEmail = async () => {
    if (!emailAddress) return toast.error('Enter email first')
    setTestingEmail(true)
    try {
      const res = await api.post<any>('/api/alerts/test/email', { email: emailAddress })
      res.success ? toast.success('Test email sent!') : toast.error('Failed')
    } catch { toast.error('Test failed') } finally { setTestingEmail(false) }
  }

  const handleSaveAlerts = async () => {
    setSavingAlerts(true)
    try {
      await api.post('/api/alerts/preferences', {
        user_id: 'demo-user', email_enabled: emailEnabled, email_address: emailAddress,
        telegram_enabled: tgEnabled, telegram_chat_id: tgChatId,
        notify_signal_generated: notifyGenerated, notify_signal_triggered: notifyTriggered,
        notify_signal_expired: notifyExpired, notify_stop_hit: notifyStop,
        notify_target_hit: notifyTarget, min_confidence: minConf,
      })
      toast.success('Alert preferences saved')
    } catch { toast.error('Failed to save') } finally { setSavingAlerts(false) }
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-tx-primary">Settings</h1>
        <p className="text-xs font-mono text-tx-tertiary mt-0.5">Accounts · Alerts · Risk limits</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-card rounded-xl border border-surface-border w-fit">
        {([
          { key: 'accounts', label: '🔑 Accounts' },
          { key: 'alerts',   label: '🔔 Alerts' },
          { key: 'risk',     label: '🛡 Risk' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx('px-3 sm:px-4 py-1.5 rounded-lg text-xs font-mono transition-all',
              tab === t.key ? 'bg-surface-elevated text-tx-primary' : 'text-tx-tertiary hover:text-tx-secondary'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Accounts tab */}
      {tab === 'accounts' && <AccountsPanel />}

      {/* Alerts tab */}
      {tab === 'alerts' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-tx-primary">Email Alerts</h2>
              <Badge variant={emailEnabled ? 'success' : 'neutral'} dot={emailEnabled}>
                {emailEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <Toggle label="Enable email alerts" checked={emailEnabled} onChange={setEmailEnabled} />
            {emailEnabled && (
              <div className="space-y-2">
                <Input label="Email" type="email" placeholder="you@example.com"
                  value={emailAddress} onChange={e => setEmailAddress(e.target.value)} />
                <Button size="sm" variant="secondary" loading={testingEmail} onClick={handleTestEmail}>
                  Send Test
                </Button>
              </div>
            )}
          </div>
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-tx-primary">Telegram Alerts</h2>
              <Badge variant={tgEnabled ? 'brand' : 'neutral'} dot={tgEnabled}>
                {tgEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <Toggle label="Enable Telegram alerts" checked={tgEnabled} onChange={setTgEnabled} />
            {tgEnabled && (
              <div className="space-y-2">
                <Input label="Chat ID" placeholder="-100123456789"
                  value={tgChatId} onChange={e => setTgChatId(e.target.value)} />
                <p className="text-xs font-mono text-tx-tertiary">
                  Get your ID from <span className="text-brand">@userinfobot</span>
                </p>
                <Button size="sm" variant="secondary" loading={testingTg} onClick={handleTestTg}>
                  Test Connection
                </Button>
              </div>
            )}
          </div>
          <div className="card p-5 space-y-2">
            <h2 className="text-sm font-semibold text-tx-primary mb-3">Notify Me When</h2>
            <Toggle label="Signal generated" checked={notifyGenerated} onChange={setNotifyGenerated} />
            <Toggle label="Signal triggered" checked={notifyTriggered} onChange={setNotifyTriggered} />
            <Toggle label="Signal expired" checked={notifyExpired} onChange={setNotifyExpired} />
            <Toggle label="Stop loss hit" checked={notifyStop} onChange={setNotifyStop} />
            <Toggle label="Target reached" checked={notifyTarget} onChange={setNotifyTarget} />
            <div className="pt-3 space-y-2">
              <label className="text-xs font-mono text-tx-tertiary uppercase tracking-widest">Min Confidence</label>
              <div className="flex gap-2">
                {(['low','medium','high'] as const).map(c => (
                  <button key={c} onClick={() => setMinConf(c)}
                    className={clsx('px-3 py-1.5 rounded-lg text-xs font-mono border capitalize transition-all',
                      minConf === c ? 'border-brand/40 bg-brand/5 text-brand' : 'border-surface-border text-tx-tertiary'
                    )}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button className="w-full" loading={savingAlerts} onClick={handleSaveAlerts}>
            Save Alert Preferences
          </Button>
        </div>
      )}

      {/* Risk tab */}
      {tab === 'risk' && <RiskDashboard />}
    </div>
  )
}
