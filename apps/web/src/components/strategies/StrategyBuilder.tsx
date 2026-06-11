'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { clsx } from 'clsx'
import type { Strategy } from '@/types/advanced'

interface Props {
  onSave: (params: Partial<Strategy>) => Promise<void>
  onCancel: () => void
}

const ALL_SYMBOLS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ADAUSDT','DOTUSDT','LINKUSDT']

export function StrategyBuilder({ onSave, onCancel }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [symbols, setSymbols] = useState<string[]>(['BTCUSDT', 'ETHUSDT'])
  const [minConfidence, setMinConfidence] = useState<'low' | 'medium' | 'high'>('medium')
  const [minScore, setMinScore] = useState('0.20')
  const [tfAlignment, setTfAlignment] = useState(2)
  const [direction, setDirection] = useState<'any' | 'long' | 'short'>('any')
  const [autoPaper, setAutoPaper] = useState(false)
  const [paperSize, setPaperSize] = useState('500')
  const [autoAlert, setAutoAlert] = useState(true)
  const [saving, setSaving] = useState(false)

  const toggleSymbol = (sym: string) => {
    setSymbols(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    )
  }

  const handleSave = async () => {
    if (!name.trim() || symbols.length === 0) return
    setSaving(true)
    await onSave({
      name: name.trim(),
      description: description.trim() || null,
      symbols,
      min_confidence: minConfidence,
      min_confluence_score: parseFloat(minScore),
      required_timeframe_alignment: tfAlignment,
      signal_direction: direction,
      auto_paper_trade: autoPaper,
      paper_size_usdt: parseFloat(paperSize),
      auto_alert: autoAlert,
      enabled: true,
    })
    setSaving(false)
  }

  return (
    <div className="card p-5 space-y-5 animate-slide-up border-brand/20">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-tx-primary">New Strategy</h3>
        <button onClick={onCancel} className="text-tx-tertiary hover:text-tx-primary text-sm">✕</button>
      </div>

      {/* Name + description */}
      <div className="space-y-3">
        <Input label="Strategy Name" placeholder="e.g. BTC Momentum Long" value={name} onChange={e => setName(e.target.value)} />
        <Input label="Description (optional)" placeholder="When RSI oversold + TF aligned bullish" value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      {/* Symbol selector */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-tx-secondary uppercase tracking-widest">Symbols</label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_SYMBOLS.map(sym => (
            <button
              key={sym}
              onClick={() => toggleSymbol(sym)}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-xs font-mono border transition-all',
                symbols.includes(sym)
                  ? 'border-brand/40 bg-brand/10 text-brand'
                  : 'border-surface-border text-tx-tertiary hover:text-tx-secondary'
              )}
            >
              {sym.replace('USDT', '')}
            </button>
          ))}
        </div>
        {symbols.length === 0 && (
          <p className="text-xs font-mono text-danger">Select at least one symbol</p>
        )}
      </div>

      {/* Conditions grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Min confidence */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-tx-secondary uppercase tracking-widest">Min Confidence</label>
          <div className="flex gap-1">
            {(['low','medium','high'] as const).map(c => (
              <button key={c} onClick={() => setMinConfidence(c)}
                className={clsx('px-2 py-1 rounded-lg text-xs font-mono border transition-all capitalize',
                  minConfidence === c ? 'border-brand/40 bg-brand/10 text-brand' : 'border-surface-border text-tx-tertiary'
                )}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Direction */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-tx-secondary uppercase tracking-widest">Direction</label>
          <div className="flex gap-1">
            {(['any','long','short'] as const).map(d => (
              <button key={d} onClick={() => setDirection(d)}
                className={clsx('px-2 py-1 rounded-lg text-xs font-mono border transition-all capitalize',
                  direction === d ? 'border-brand/40 bg-brand/10 text-brand' : 'border-surface-border text-tx-tertiary'
                )}>
                {d === 'any' ? '↕' : d === 'long' ? '↑' : '↓'} {d}
              </button>
            ))}
          </div>
        </div>

        {/* Min score */}
        <Input label="Min Confluence Score" type="number" step="0.05"
          value={minScore} onChange={e => setMinScore(e.target.value)} />

        {/* TF alignment */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-tx-secondary uppercase tracking-widest">TF Alignment</label>
          <div className="flex gap-1">
            {[1,2,3].map(n => (
              <button key={n} onClick={() => setTfAlignment(n)}
                className={clsx('w-8 py-1.5 rounded-lg text-xs font-mono border transition-all',
                  tfAlignment === n ? 'border-brand/40 bg-brand/10 text-brand' : 'border-surface-border text-tx-tertiary'
                )}>
                {n}
              </button>
            ))}
            <span className="text-xs font-mono text-tx-tertiary self-center ml-1">/ 3 TFs</span>
          </div>
        </div>
      </div>

      {/* Execution options */}
      <div className="space-y-3 pt-1 border-t border-surface-border">
        <p className="text-xs font-mono text-tx-tertiary uppercase tracking-widest">On Trigger</p>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-sm text-tx-secondary">Auto paper trade</span>
            <p className="text-xs font-mono text-tx-tertiary">Open simulated position automatically</p>
          </div>
          <button onClick={() => setAutoPaper(p => !p)}
            className={clsx('relative w-9 h-5 rounded-full transition-colors', autoPaper ? 'bg-brand' : 'bg-surface-border')}>
            <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all', autoPaper ? 'left-4' : 'left-0.5')} />
          </button>
        </label>
        {autoPaper && (
          <Input label="Paper size (USDT)" type="number" value={paperSize}
            onChange={e => setPaperSize(e.target.value)} suffix="USDT" />
        )}
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-sm text-tx-secondary">Auto alert</span>
            <p className="text-xs font-mono text-tx-tertiary">Send email/Telegram on trigger</p>
          </div>
          <button onClick={() => setAutoAlert(p => !p)}
            className={clsx('relative w-9 h-5 rounded-full transition-colors', autoAlert ? 'bg-brand' : 'bg-surface-border')}>
            <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all', autoAlert ? 'left-4' : 'left-0.5')} />
          </button>
        </label>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" loading={saving} disabled={!name.trim() || symbols.length === 0} onClick={handleSave}>
          Create Strategy
        </Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
