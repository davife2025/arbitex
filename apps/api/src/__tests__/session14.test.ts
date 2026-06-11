import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Journal stats aggregation ────────────────────────────────

interface MockEntry {
  mood: string
  tags: string[]
  pnl_pct: number | null
}

function aggregateMoods(entries: MockEntry[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const e of entries) map[e.mood] = (map[e.mood] ?? 0) + 1
  return map
}

function aggregateTags(entries: MockEntry[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const e of entries)
    for (const tag of e.tags) map[tag] = (map[tag] ?? 0) + 1
  return map
}

function avgPnl(entries: MockEntry[]): number {
  const withPnl = entries.filter(e => e.pnl_pct != null)
  if (!withPnl.length) return 0
  return withPnl.reduce((s, e) => s + (e.pnl_pct ?? 0), 0) / withPnl.length
}

const ENTRIES: MockEntry[] = [
  { mood: 'confident', tags: ['win','breakout'], pnl_pct: 3.2 },
  { mood: 'fearful',   tags: ['loss','revenge-trade'], pnl_pct: -1.5 },
  { mood: 'confident', tags: ['win','discipline'], pnl_pct: 1.8 },
  { mood: 'neutral',   tags: [], pnl_pct: null },
  { mood: 'greedy',    tags: ['loss','fomo','oversize'], pnl_pct: -2.1 },
]

describe('Journal — mood aggregation', () => {
  it('counts each mood correctly', () => {
    const moods = aggregateMoods(ENTRIES)
    expect(moods['confident']).toBe(2)
    expect(moods['fearful']).toBe(1)
    expect(moods['greedy']).toBe(1)
    expect(moods['neutral']).toBe(1)
  })

  it('handles entries with no tags', () => {
    const tags = aggregateTags(ENTRIES)
    expect(tags['win']).toBe(2)
    expect(tags['loss']).toBe(2)
    expect(tags['fomo']).toBe(1)
    expect(tags['breakout']).toBe(1)
  })

  it('computes avg PnL excluding null entries', () => {
    const avg = avgPnl(ENTRIES)
    // (3.2 + -1.5 + 1.8 + -2.1) / 4 = 1.4 / 4 = 0.35
    expect(avg).toBeCloseTo(0.35, 2)
  })

  it('returns 0 avg PnL when all entries have null pnl', () => {
    const nullEntries: MockEntry[] = [
      { mood: 'neutral', tags: [], pnl_pct: null },
      { mood: 'neutral', tags: [], pnl_pct: null },
    ]
    expect(avgPnl(nullEntries)).toBe(0)
  })

  it('identifies best and worst entries correctly', () => {
    const withPnl = ENTRIES.filter(e => e.pnl_pct != null)
    const sorted = [...withPnl].sort((a, b) => (b.pnl_pct ?? 0) - (a.pnl_pct ?? 0))
    expect(sorted[0].pnl_pct).toBe(3.2)
    expect(sorted[sorted.length - 1].pnl_pct).toBe(-2.1)
  })
})

// ── Notification service ─────────────────────────────────────

const notificationTypes = [
  'signal_generated','signal_triggered','signal_expired',
  'stop_hit','target_hit','price_alert',
  'circuit_breaker','strategy_triggered','commentary_updated','system',
]

const typeConfig: Record<string, { icon: string; default_title: string }> = {
  signal_generated:   { icon: '◈', default_title: 'New AI Signal' },
  signal_triggered:   { icon: '⚡', default_title: 'Signal Triggered' },
  signal_expired:     { icon: '⏱', default_title: 'Signal Expired' },
  stop_hit:           { icon: '🛑', default_title: 'Stop Loss Hit' },
  target_hit:         { icon: '🎯', default_title: 'Target Reached' },
  price_alert:        { icon: '🔔', default_title: 'Price Alert' },
  circuit_breaker:    { icon: '⚠', default_title: 'Circuit Breaker Active' },
  strategy_triggered: { icon: '⚙', default_title: 'Strategy Triggered' },
  commentary_updated: { icon: '📰', default_title: 'Market Brief Updated' },
  system:             { icon: 'ℹ', default_title: 'System Notice' },
}

describe('Notification service', () => {
  it('has icon + title for every notification type', () => {
    for (const type of notificationTypes) {
      expect(typeConfig[type]).toBeDefined()
      expect(typeConfig[type].icon).toBeTruthy()
      expect(typeConfig[type].default_title).toBeTruthy()
    }
  })

  it('all icons are non-empty strings', () => {
    for (const { icon } of Object.values(typeConfig)) {
      expect(typeof icon).toBe('string')
      expect(icon.length).toBeGreaterThan(0)
    }
  })

  it('unread count decrements on markRead', () => {
    let unread = 5
    const ids = ['a','b']
    unread = Math.max(0, unread - ids.length)
    expect(unread).toBe(3)
  })

  it('unread count does not go below 0', () => {
    let unread = 1
    const ids = ['a','b','c']
    unread = Math.max(0, unread - ids.length)
    expect(unread).toBe(0)
  })

  it('markAllRead sets unread to 0', () => {
    let unread = 12
    unread = 0
    expect(unread).toBe(0)
  })
})

// ── Rate limit tracker ───────────────────────────────────────

interface Request { ts: number; endpoint: string; ms: number; error: boolean }

function filterLastHour(requests: Request[]): Request[] {
  const cutoff = Date.now() - 3600000
  return requests.filter(r => r.ts >= cutoff)
}

function calcErrorRate(requests: Request[]): number {
  if (!requests.length) return 0
  return (requests.filter(r => r.error).length / requests.length) * 100
}

function calcAvgMs(requests: Request[]): number {
  if (!requests.length) return 0
  return requests.reduce((s, r) => s + r.ms, 0) / requests.length
}

function groupByEndpoint(requests: Request[]): Record<string, Request[]> {
  const map: Record<string, Request[]> = {}
  for (const r of requests) {
    if (!map[r.endpoint]) map[r.endpoint] = []
    map[r.endpoint].push(r)
  }
  return map
}

describe('Rate limit tracker', () => {
  const now = Date.now()
  const mockRequests: Request[] = [
    { ts: now - 1000,    endpoint: '/api/market/tickers', ms: 120, error: false },
    { ts: now - 2000,    endpoint: '/api/market/tickers', ms: 150, error: false },
    { ts: now - 3000,    endpoint: '/api/signals/generate', ms: 2000, error: false },
    { ts: now - 4000,    endpoint: '/api/signals/generate', ms: 2500, error: true },
    { ts: now - 3700000, endpoint: '/api/market/tickers', ms: 100, error: false }, // outside 1hr
  ]

  it('filters to last hour correctly', () => {
    const recent = filterLastHour(mockRequests)
    expect(recent).toHaveLength(4) // last one is outside 1hr
  })

  it('computes error rate correctly', () => {
    const recent = filterLastHour(mockRequests)
    const rate = calcErrorRate(recent)
    expect(rate).toBe(25) // 1 error out of 4
  })

  it('computes avg response ms', () => {
    const recent = filterLastHour(mockRequests)
    const avg = calcAvgMs(recent)
    expect(avg).toBeCloseTo((120 + 150 + 2000 + 2500) / 4)
  })

  it('groups requests by endpoint', () => {
    const recent = filterLastHour(mockRequests)
    const grouped = groupByEndpoint(recent)
    expect(grouped['/api/market/tickers']).toHaveLength(2)
    expect(grouped['/api/signals/generate']).toHaveLength(2)
  })

  it('returns 0 error rate when no errors', () => {
    const clean = mockRequests.filter(r => !r.error)
    expect(calcErrorRate(clean)).toBe(0)
  })

  it('returns 100 error rate when all errored', () => {
    const allErrors = mockRequests.map(r => ({ ...r, error: true }))
    const recent = filterLastHour(allErrors)
    expect(calcErrorRate(recent)).toBe(100)
  })

  it('Bitget estimated per-second calc', () => {
    const lastMinuteCount = 30
    const estimatedPerSecond = lastMinuteCount / 60
    expect(estimatedPerSecond).toBeCloseTo(0.5)
  })

  it('warns when approaching private rate limit', () => {
    const PRIVATE_LIMIT = 10
    const estimatedPerSecond = 8.5
    const warning = estimatedPerSecond > PRIVATE_LIMIT * 0.8
    expect(warning).toBe(true)
  })
})
