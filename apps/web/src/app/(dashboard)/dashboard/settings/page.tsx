'use client'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-tx-primary">Settings</h1>
        <p className="text-xs font-mono text-tx-tertiary mt-0.5">Configure your Arbitex connection</p>
      </div>

      {/* Bitget connection */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-tx-primary">Bitget API</h2>
          <Badge variant="success" dot>Connected</Badge>
        </div>
        <div className="space-y-3">
          <Input label="API Key" type="password" placeholder="••••••••••••" />
          <Input label="API Secret" type="password" placeholder="••••••••••••" />
          <Input label="Passphrase" type="password" placeholder="••••••••••••" />
        </div>
        <Button size="sm" variant="secondary" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Update Keys'}
        </Button>
      </div>

      {/* AI settings */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-tx-primary">AI Configuration</h2>
        <div className="space-y-3">
          <Input label="HuggingFace Token" type="password" placeholder="hf_••••••••••••" />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-tx-secondary uppercase tracking-widest">Model</label>
            <div className="card-elevated px-3 py-2 text-sm font-mono text-brand">
              moonshotai/Kimi-K2-Instruct
            </div>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save'}
        </Button>
      </div>

      {/* Signal preferences */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-tx-primary">Signal Preferences</h2>
        <div className="space-y-3">
          <Input label="Default Interval" placeholder="1h" />
          <Input label="Signal Expiry (hours)" type="number" placeholder="4" />
          <Input label="Max Active Signals" type="number" placeholder="10" />
        </div>
        <Button size="sm" variant="secondary" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
