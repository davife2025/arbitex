'use client'
import { useState } from 'react'
import { useJournal } from '@/hooks/useJournal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Stat } from '@/components/ui/Stat'
import { clsx } from 'clsx'
import type { JournalMood } from '@/types/advanced'

const MOODS: { value: JournalMood; label: string; icon: string; color: string }[] = [
  { value: 'confident', label: 'Confident', icon: '💪', color: 'text-success' },
  { value: 'uncertain', label: 'Uncertain', icon: '🤔', color: 'text-warning' },
  { value: 'fearful',   label: 'Fearful',   icon: '😰', color: 'text-danger' },
  { value: 'greedy',    label: 'Greedy',    icon: '🤑', color: 'text-warning' },
  { value: 'neutral',   label: 'Neutral',   icon: '😐', color: 'text-tx-secondary' },
]

const TAG_SUGGESTIONS = ['win','loss','revenge-trade','fomo','discipline','patience','oversize','undersize','news','breakout','pullback']

function JournalForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const { create } = useJournal()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [mood, setMood] = useState<JournalMood>('neutral')
  const [tags, setTags] = useState<string[]>([])
  const [lessons, setLessons] = useState('')
  const [mistakes, setMistakes] = useState('')
  const [pnlPct, setPnlPct] = useState('')
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    await create({
      title: title.trim(),
      body: body.trim() || null,
      mood,
      tags,
      lessons_learned: lessons.trim() || null,
      mistakes: mistakes.trim() || null,
      pnl_pct: pnlPct ? parseFloat(pnlPct) : null,
    })
    setSaving(false)
    onSave()
  }

  return (
    <div className="card p-5 space-y-4 border-brand/20 animate-slide-up">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-tx-primary">New Journal Entry</h3>
        <button onClick={onCancel} className="text-tx-tertiary hover:text-tx-primary text-sm">✕</button>
      </div>

      <Input label="Title" placeholder="BTCUSDT long — missed the entry" value={title}
        onChange={e => setTitle(e.target.value)} />

      {/* Mood picker */}
      <div className="space-y-1.5">
        <label className="text-xs font-mono text-tx-secondary uppercase tracking-widest">Mood</label>
        <div className="flex gap-2 flex-wrap">
          {MOODS.map(m => (
            <button key={m.value} onClick={() => setMood(m.value)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-mono border transition-all flex items-center gap-1.5',
                mood === m.value ? 'border-brand/40 bg-brand/10 text-brand' : 'border-surface-border text-tx-tertiary'
              )}>
              <span>{m.icon}</span> {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-mono text-tx-secondary uppercase tracking-widest">Notes</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="What happened? Market context, your reasoning, emotional state..."
          rows={4}
          className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm font-mono text-tx-primary placeholder:text-tx-tertiary outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/20 resize-none transition-all"
        />
      </div>

      {/* PnL */}
      <Input label="PnL % (optional)" type="number" step="0.01"
        placeholder="+2.5 or -1.2" value={pnlPct}
        onChange={e => setPnlPct(e.target.value)} suffix="%" />

      {/* Tags */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-tx-secondary uppercase tracking-widest">Tags</label>
        <div className="flex gap-2 flex-wrap mb-2">
          {tags.map(tag => (
            <button key={tag} onClick={() => setTags(prev => prev.filter(t => t !== tag))}
              className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-mono border border-brand/20 flex items-center gap-1 hover:bg-danger/10 hover:text-danger hover:border-danger/20 transition-all">
              #{tag} ✕
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {TAG_SUGGESTIONS.filter(t => !tags.includes(t)).map(tag => (
            <button key={tag} onClick={() => addTag(tag)}
              className="px-2 py-0.5 rounded-full bg-surface-elevated text-tx-tertiary text-xs font-mono border border-surface-border hover:border-brand/30 hover:text-tx-secondary transition-all">
              +{tag}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="custom-tag" value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag(tagInput)} />
          <Button size="sm" variant="secondary" onClick={() => addTag(tagInput)}>Add</Button>
        </div>
      </div>

      {/* Lessons + mistakes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-success uppercase tracking-widest">Lessons Learned</label>
          <textarea value={lessons} onChange={e => setLessons(e.target.value)}
            placeholder="What worked? What would you do again?" rows={3}
            className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-xs font-mono text-tx-primary placeholder:text-tx-tertiary outline-none focus:border-success/40 resize-none transition-all" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-danger uppercase tracking-widest">Mistakes</label>
          <textarea value={mistakes} onChange={e => setMistakes(e.target.value)}
            placeholder="What went wrong? What to avoid?" rows={3}
            className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-xs font-mono text-tx-primary placeholder:text-tx-tertiary outline-none focus:border-danger/40 resize-none transition-all" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" loading={saving} disabled={!title.trim()} onClick={handleSave}>
          Save Entry
        </Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

function EntryCard({ entry, onDelete }: { entry: any; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const mood = MOODS.find(m => m.value === entry.mood)
  const pnlUp = (entry.pnl_pct ?? 0) >= 0

  return (
    <div className="card p-4 space-y-2 hover:border-surface-border-bright transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-tx-primary truncate">{entry.title}</span>
            {mood && <span title={mood.label}>{mood.icon}</span>}
            {entry.pnl_pct != null && (
              <Badge variant={pnlUp ? 'success' : 'danger'}>
                {pnlUp ? '+' : ''}{entry.pnl_pct.toFixed(2)}%
              </Badge>
            )}
          </div>
          <p className="text-[10px] font-mono text-tx-tertiary mt-0.5">
            {new Date(entry.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => setExpanded(e => !e)}
            className="text-xs font-mono text-tx-tertiary hover:text-brand transition-colors px-1">
            {expanded ? '▲' : '▼'}
          </button>
          <button onClick={() => onDelete(entry.id)}
            className="text-xs text-tx-tertiary hover:text-danger transition-colors px-1">✕</button>
        </div>
      </div>

      {entry.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {entry.tags.map((tag: string) => (
            <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-surface-elevated text-tx-tertiary border border-surface-border">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="space-y-2 pt-1 border-t border-surface-border animate-fade-in">
          {entry.body && (
            <p className="text-xs font-mono text-tx-secondary leading-relaxed whitespace-pre-wrap">{entry.body}</p>
          )}
          {entry.lessons_learned && (
            <div>
              <p className="text-[10px] font-mono text-success uppercase tracking-widest mb-0.5">Lessons</p>
              <p className="text-xs font-mono text-tx-secondary">{entry.lessons_learned}</p>
            </div>
          )}
          {entry.mistakes && (
            <div>
              <p className="text-[10px] font-mono text-danger uppercase tracking-widest mb-0.5">Mistakes</p>
              <p className="text-xs font-mono text-tx-secondary">{entry.mistakes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function JournalPage() {
  const { entries, stats, tags, loading, fetchEntries, remove } = useJournal()
  const [showForm, setShowForm] = useState(false)
  const [filterMood, setFilterMood] = useState('')
  const [filterTag, setFilterTag] = useState('')

  const handleFilter = () => {
    const f: Record<string, string> = {}
    if (filterMood) f.mood = filterMood
    if (filterTag)  f.tag  = filterTag
    fetchEntries(f)
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-tx-primary">Trade Journal</h1>
          <p className="text-xs font-mono text-tx-tertiary mt-0.5">
            Document trades · Track mood · Learn from mistakes
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ New Entry'}
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card p-4">
            <Stat label="Total Entries" value={stats.total_entries} />
          </div>
          <div className="card p-4">
            <Stat label="Avg PnL" value={`${stats.avg_pnl_pct >= 0 ? '+' : ''}${stats.avg_pnl_pct.toFixed(2)}%`}
              trend={stats.avg_pnl_pct >= 0 ? 'up' : 'down'} mono />
          </div>
          <div className="card p-4">
            <div className="space-y-1">
              <p className="text-xs font-mono text-tx-secondary uppercase tracking-widest">Mood Split</p>
              <div className="flex gap-1 flex-wrap">
                {Object.entries(stats.by_mood).map(([m, count]) => {
                  const mood = MOODS.find(x => x.value === m)
                  return (
                    <span key={m} className="text-xs font-mono text-tx-secondary">
                      {mood?.icon}{count}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="space-y-1">
              <p className="text-xs font-mono text-tx-secondary uppercase tracking-widest">Top Tags</p>
              <div className="flex gap-1 flex-wrap">
                {Object.entries(stats.by_tag).sort((a,b) => b[1]-a[1]).slice(0,3).map(([tag, count]) => (
                  <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-tx-tertiary">
                    #{tag} ({count})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New entry form */}
      {showForm && (
        <JournalForm onSave={() => { setShowForm(false); fetchEntries() }} onCancel={() => setShowForm(false)} />
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex gap-1">
          {MOODS.map(m => (
            <button key={m.value}
              onClick={() => { setFilterMood(f => f === m.value ? '' : m.value) }}
              className={clsx('px-2 py-1 rounded-lg text-xs font-mono border transition-all',
                filterMood === m.value
                  ? 'border-brand/40 bg-brand/10 text-brand'
                  : 'border-surface-border text-tx-tertiary hover:text-tx-secondary'
              )} title={m.label}>
              {m.icon}
            </button>
          ))}
        </div>
        {tags.length > 0 && (
          <select
            value={filterTag}
            onChange={e => setFilterTag(e.target.value)}
            className="bg-surface border border-surface-border rounded-lg px-2 py-1 text-xs font-mono text-tx-secondary outline-none focus:border-brand/40"
          >
            <option value="">All tags</option>
            {tags.map(t => <option key={t} value={t}>#{t}</option>)}
          </select>
        )}
        {(filterMood || filterTag) && (
          <Button size="sm" variant="secondary" onClick={handleFilter}>Apply</Button>
        )}
        {(filterMood || filterTag) && (
          <Button size="sm" variant="ghost" onClick={() => { setFilterMood(''); setFilterTag(''); fetchEntries() }}>
            Clear
          </Button>
        )}
      </div>

      {/* Entry list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="card p-4 animate-pulse space-y-2">
              <div className="h-4 w-3/4 bg-surface-elevated rounded" />
              <div className="h-3 w-1/4 bg-surface-elevated rounded" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <p className="text-tx-tertiary font-mono text-sm">No journal entries yet</p>
          <p className="text-xs font-mono text-tx-tertiary max-w-xs mx-auto">
            Document your trades, emotions, and learnings to improve as a trader.
          </p>
          <Button size="sm" className="mx-auto" onClick={() => setShowForm(true)}>
            Write first entry
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <EntryCard key={entry.id} entry={entry} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  )
}
