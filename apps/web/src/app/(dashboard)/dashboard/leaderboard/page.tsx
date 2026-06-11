'use client'
import { useState } from 'react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useExport } from '@/hooks/useExport'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Stat } from '@/components/ui/Stat'
import { clsx } from 'clsx'

const AVATAR_COLORS = ['#00E5FF','#00C48C','#FFB800','#FF4757','#A855F7','#F97316','#EC4899','#14B8A6']
const SORT_OPTIONS = [
  { key: 'return'   as const, label: 'Total Return' },
  { key: 'win_rate' as const, label: 'Win Rate'     },
  { key: 'sharpe'   as const, label: 'Sharpe'       },
]

function Avatar({ name, color, rank }: { name: string; color: string; rank?: number | null }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="relative flex-shrink-0">
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-surface"
        style={{ backgroundColor: color }}>
        {initials}
      </div>
      {rank && rank <= 3 && (
        <div className="absolute -top-1 -right-1 text-sm leading-none">
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
        </div>
      )}
    </div>
  )
}

export default function LeaderboardPage() {
  const { entries, myEntry, loading, sortBy, updateConfig, snapshotMe, changeSort } = useLeaderboard()
  const { exporting, exportJournal, exportPerformance, exportSignals, exportFull } = useExport()

  const [editingProfile, setEditingProfile] = useState(false)
  const [displayName, setDisplayName] = useState(myEntry?.display_name ?? 'Trader')
  const [avatarColor, setAvatarColor] = useState(myEntry?.avatar_color ?? '#00E5FF')
  const [isPublic, setIsPublic] = useState(myEntry?.is_public ?? false)
  const [savingProfile, setSavingProfile] = useState(false)

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    await updateConfig({ display_name: displayName, avatar_color: avatarColor, is_public: isPublic })
    setSavingProfile(false)
    setEditingProfile(false)
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-tx-primary">Leaderboard</h1>
          <p className="text-xs font-mono text-tx-tertiary mt-0.5">
            Paper trading competition · Opt-in · Anonymised by default
          </p>
        </div>
        <Button size="sm" variant="secondary" loading={loading} onClick={snapshotMe}>
          ↑ Submit Stats
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">

        {/* Leaderboard table */}
        <div className="space-y-4">

          {/* Sort tabs */}
          <div className="flex gap-1 p-1 bg-surface-card rounded-xl border border-surface-border w-fit">
            {SORT_OPTIONS.map(opt => (
              <button key={opt.key} onClick={() => changeSort(opt.key)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-mono transition-all',
                  sortBy === opt.key ? 'bg-surface-elevated text-tx-primary' : 'text-tx-tertiary hover:text-tx-secondary'
                )}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            {entries.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-tx-tertiary font-mono text-sm">No public entries yet</p>
                <p className="text-xs font-mono text-tx-tertiary">
                  Enable your profile below and submit your stats to join the leaderboard.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-surface-border">
                      {['Rank','Trader','Return','Win Rate','Trades','Sharpe','Max DD'].map(h => (
                        <th key={h} className="text-left py-2.5 px-3 text-tx-tertiary font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, i) => {
                      const isMe = entry.user_id === 'demo-user'
                      const rankChange = entry.rank_change
                      const returnUp = entry.paper_total_return_pct >= 0

                      return (
                        <tr key={entry.id}
                          className={clsx(
                            'border-b border-surface-border/40 transition-colors',
                            isMe ? 'bg-brand/5' : 'hover:bg-surface-elevated/50'
                          )}>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
                              <span className={clsx('font-bold',
                                i === 0 ? 'text-warning' : i === 1 ? 'text-tx-secondary' : i === 2 ? 'text-warning/70' : 'text-tx-tertiary'
                              )}>
                                #{entry.rank ?? i + 1}
                              </span>
                              {rankChange !== 0 && (
                                <span className={clsx('text-[10px]', rankChange < 0 ? 'text-success' : 'text-danger')}>
                                  {rankChange < 0 ? '↑' : '↓'}{Math.abs(rankChange)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={entry.display_name} color={entry.avatar_color} rank={entry.rank} />
                              <div>
                                <span className={clsx('font-semibold', isMe ? 'text-brand' : 'text-tx-primary')}>
                                  {entry.display_name}
                                </span>
                                {isMe && <span className="ml-1 text-[10px] text-brand">(you)</span>}
                              </div>
                            </div>
                          </td>
                          <td className={clsx('py-3 px-3 font-bold', returnUp ? 'text-success' : 'text-danger')}>
                            {returnUp ? '+' : ''}{entry.paper_total_return_pct.toFixed(2)}%
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={entry.paper_win_rate >= 55 ? 'success' : entry.paper_win_rate >= 45 ? 'warning' : 'danger'}>
                              {entry.paper_win_rate.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-tx-secondary">{entry.paper_total_trades}</td>
                          <td className="py-3 px-3 text-tx-secondary">{entry.paper_sharpe.toFixed(2)}</td>
                          <td className={clsx('py-3 px-3', entry.paper_max_drawdown_pct > 20 ? 'text-danger' : 'text-tx-secondary')}>
                            -{entry.paper_max_drawdown_pct.toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* My stats card */}
          {myEntry && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-tx-primary">Your Stats</h3>
                <Badge variant={myEntry.is_public ? 'success' : 'neutral'} dot={myEntry.is_public}>
                  {myEntry.is_public ? 'Public' : 'Private'}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Avatar name={myEntry.display_name} color={myEntry.avatar_color} rank={myEntry.rank} />
                <div>
                  <p className="font-semibold text-tx-primary text-sm">{myEntry.display_name}</p>
                  {myEntry.rank && (
                    <p className="text-xs font-mono text-tx-tertiary">Rank #{myEntry.rank}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="card-elevated p-2 text-xs font-mono">
                  <div className="text-tx-tertiary mb-0.5">Return</div>
                  <div className={clsx('font-bold', myEntry.paper_total_return_pct >= 0 ? 'text-success' : 'text-danger')}>
                    {myEntry.paper_total_return_pct >= 0 ? '+' : ''}{myEntry.paper_total_return_pct.toFixed(2)}%
                  </div>
                </div>
                <div className="card-elevated p-2 text-xs font-mono">
                  <div className="text-tx-tertiary mb-0.5">Win Rate</div>
                  <div className="text-tx-primary font-bold">{myEntry.paper_win_rate.toFixed(1)}%</div>
                </div>
                <div className="card-elevated p-2 text-xs font-mono">
                  <div className="text-tx-tertiary mb-0.5">Sharpe</div>
                  <div className="text-tx-primary">{myEntry.paper_sharpe.toFixed(2)}</div>
                </div>
                <div className="card-elevated p-2 text-xs font-mono">
                  <div className="text-tx-tertiary mb-0.5">Trades</div>
                  <div className="text-tx-primary">{myEntry.paper_total_trades}</div>
                </div>
              </div>
              <Button size="sm" variant="secondary" className="w-full"
                onClick={() => setEditingProfile(e => !e)}>
                {editingProfile ? 'Cancel' : 'Edit Profile'}
              </Button>

              {/* Profile editor */}
              {editingProfile && (
                <div className="space-y-3 pt-2 border-t border-surface-border animate-slide-up">
                  <Input label="Display Name" value={displayName}
                    onChange={e => setDisplayName(e.target.value)} />
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-tx-secondary uppercase tracking-widest">Avatar Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {AVATAR_COLORS.map(c => (
                        <button key={c} onClick={() => setAvatarColor(c)}
                          className={clsx('w-6 h-6 rounded-full border-2 transition-all',
                            avatarColor === c ? 'border-white scale-110' : 'border-transparent'
                          )}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isPublic}
                      onChange={e => setIsPublic(e.target.checked)} className="accent-brand" />
                    <span className="text-sm text-tx-secondary">Show on public leaderboard</span>
                  </label>
                  <Button className="w-full" loading={savingProfile} onClick={handleSaveProfile}>
                    Save Profile
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Export panel */}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-tx-primary">Export Data</h3>
            <p className="text-xs font-mono text-tx-tertiary">Download your Arbitex data for external analysis.</p>
            <div className="space-y-2">
              {[
                { label: '📓 Journal (CSV)', action: exportJournal, key: 'journal' },
                { label: '📊 Performance (CSV)', action: exportPerformance, key: 'performance' },
                { label: '◈ Signals (CSV)', action: exportSignals, key: 'signals' },
                { label: '📦 Full Export (JSON)', action: exportFull, key: 'full' },
              ].map(item => (
                <Button key={item.key} size="sm" variant="secondary" className="w-full justify-start"
                  loading={exporting === item.key}
                  onClick={item.action}>
                  {item.label}
                </Button>
              ))}
            </div>
            <p className="text-[10px] font-mono text-tx-tertiary">
              Exports include all your historical data. Full JSON includes journal, signals, paper trades, and alert log.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
