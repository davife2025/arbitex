'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'
import type { MarketCommentary } from '@/types/advanced'
import type { ApiResponse } from '@arbitex/types'

const moodConfig = {
  bullish: { variant: 'success' as const, icon: '↑', label: 'Bullish' },
  bearish: { variant: 'danger'  as const, icon: '↓', label: 'Bearish' },
  neutral: { variant: 'neutral' as const, icon: '→', label: 'Neutral' },
  mixed:   { variant: 'warning' as const, icon: '↕', label: 'Mixed'   },
}

export function MarketCommentaryCard() {
  const [commentary, setCommentary] = useState<MarketCommentary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetch = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<MarketCommentary>>('/api/commentary')
      if (res.success && res.data) setCommentary(res.data)
    } catch (err) {
      console.error('Commentary fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = async () => {
    setRefreshing(true)
    try {
      const res = await api.post<ApiResponse<MarketCommentary>>('/api/commentary/refresh', {})
      if (res.success && res.data) setCommentary(res.data)
    } catch (err) {
      console.error('Commentary refresh error:', err)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { fetch() }, [fetch])

  if (loading) {
    return (
      <div className="card p-4 space-y-2 animate-pulse">
        <div className="h-4 w-40 bg-surface-elevated rounded" />
        <div className="h-3 w-full bg-surface-elevated rounded" />
        <div className="h-3 w-5/6 bg-surface-elevated rounded" />
      </div>
    )
  }

  if (!commentary) return null

  const mood = moodConfig[commentary.market_mood] ?? moodConfig.neutral
  const age = Math.round((Date.now() - new Date(commentary.generated_at).getTime()) / 60000)
  const ageLabel = age < 60 ? `${age}m ago` : `${Math.round(age / 60)}h ago`
  const keySymbols = Object.entries(commentary.key_levels ?? {}).slice(0, 2)

  return (
    <div className="card p-4 space-y-3 border-surface-border hover:border-surface-border-bright transition-colors">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-tx-tertiary uppercase tracking-widest">
            Kimi K2 · Market Brief
          </span>
          <Badge variant={mood.variant}>
            {mood.icon} {mood.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-tx-tertiary">{ageLabel}</span>
          <Button size="sm" variant="ghost" loading={refreshing} onClick={refresh}
            className="text-tx-tertiary hover:text-brand px-2 py-1 min-h-0 h-auto text-[10px]">
            ↺
          </Button>
        </div>
      </div>

      {/* Commentary text */}
      <p className={clsx(
        'text-sm text-tx-secondary leading-relaxed',
        !expanded && 'line-clamp-3'
      )}>
        {commentary.commentary}
      </p>

      {commentary.commentary.length > 200 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs font-mono text-brand hover:text-brand/80 transition-colors"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Key levels */}
      {keySymbols.length > 0 && (
        <div className="flex gap-3 flex-wrap pt-1 border-t border-surface-border">
          {keySymbols.map(([sym, levels]) => (
            <div key={sym} className="text-xs font-mono">
              <span className="text-tx-tertiary">{sym.replace('USDT', '')} </span>
              <span className="text-success">S: ${levels.support.toLocaleString()}</span>
              <span className="text-tx-tertiary mx-1">/</span>
              <span className="text-danger">R: ${levels.resistance.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
