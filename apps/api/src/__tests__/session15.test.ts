import { describe, it, expect } from 'vitest'

// ── Leaderboard ranking ───────────────────────────────────────

interface LBEntry { user_id: string; paper_total_return_pct: number; rank?: number }

function assignRanks(entries: LBEntry[]): LBEntry[] {
  return [...entries]
    .sort((a, b) => b.paper_total_return_pct - a.paper_total_return_pct)
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

function computeRankChange(currentRank: number, previousRank: number | null): number {
  if (!previousRank) return 0
  return previousRank - currentRank  // positive = moved up
}

describe('Leaderboard — ranking', () => {
  const entries: LBEntry[] = [
    { user_id: 'a', paper_total_return_pct: 15.5 },
    { user_id: 'b', paper_total_return_pct: 32.1 },
    { user_id: 'c', paper_total_return_pct: -3.2 },
    { user_id: 'd', paper_total_return_pct: 8.7 },
  ]

  it('assigns rank 1 to highest return', () => {
    const ranked = assignRanks(entries)
    expect(ranked.find(e => e.user_id === 'b')?.rank).toBe(1)
  })

  it('assigns last rank to negative return', () => {
    const ranked = assignRanks(entries)
    expect(ranked.find(e => e.user_id === 'c')?.rank).toBe(4)
  })

  it('ranks are sequential 1..N', () => {
    const ranked = assignRanks(entries)
    const ranks = ranked.map(e => e.rank!).sort((a, b) => a - b)
    expect(ranks).toEqual([1, 2, 3, 4])
  })

  it('rank_change is positive when moved up', () => {
    // was rank 3, now rank 1 → moved up 2
    expect(computeRankChange(1, 3)).toBe(2)
  })

  it('rank_change is negative when moved down', () => {
    expect(computeRankChange(5, 2)).toBe(-3)
  })

  it('rank_change is 0 for new entries', () => {
    expect(computeRankChange(3, null)).toBe(0)
  })

  it('rank_change is 0 when rank unchanged', () => {
    expect(computeRankChange(2, 2)).toBe(0)
  })
})

// ── CSV export ────────────────────────────────────────────────

function escapeCSV(val: any): string {
  if (val == null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCSV(rows: Record<string, any>[], headers: string[]): string {
  const headerRow = headers.map(escapeCSV).join(',')
  const dataRows = rows.map(row => headers.map(h => escapeCSV(row[h])).join(','))
  return [headerRow, ...dataRows].join('\n')
}

describe('Data export — CSV generation', () => {
  const rows = [
    { symbol: 'BTCUSDT', pnl_pct: 3.2, direction: 'long', outcome: 'win' },
    { symbol: 'ETHUSDT', pnl_pct: -1.5, direction: 'short', outcome: 'loss' },
  ]
  const headers = ['symbol', 'direction', 'pnl_pct', 'outcome']

  it('produces correct header row', () => {
    const csv = toCSV(rows, headers)
    const lines = csv.split('\n')
    expect(lines[0]).toBe('symbol,direction,pnl_pct,outcome')
  })

  it('produces correct data rows', () => {
    const csv = toCSV(rows, headers)
    const lines = csv.split('\n')
    expect(lines[1]).toBe('BTCUSDT,long,3.2,win')
    expect(lines[2]).toBe('ETHUSDT,short,-1.5,loss')
  })

  it('row count matches input', () => {
    const csv = toCSV(rows, headers)
    const lines = csv.split('\n')
    expect(lines).toHaveLength(rows.length + 1) // +1 for header
  })

  it('escapes values containing commas', () => {
    const r = [{ note: 'win, big one', val: 1 }]
    const csv = toCSV(r, ['note', 'val'])
    expect(csv).toContain('"win, big one"')
  })

  it('escapes values containing double quotes', () => {
    const r = [{ note: 'he said "buy"', val: 1 }]
    const csv = toCSV(r, ['note', 'val'])
    expect(csv).toContain('"he said ""buy"""')
  })

  it('handles null values as empty string', () => {
    const r = [{ symbol: 'BTC', pnl: null }]
    const csv = toCSV(r, ['symbol', 'pnl'])
    expect(csv.split('\n')[1]).toBe('BTC,')
  })

  it('handles arrays by joining with semicolon', () => {
    const r = [{ tags: ['win','breakout','discipline'] }]
    const mapped = r.map(row => ({ tags: (row.tags as string[]).join(';') }))
    const csv = toCSV(mapped, ['tags'])
    expect(csv).toContain('win;breakout;discipline')
  })
})

// ── Backtest equity curve ─────────────────────────────────────

describe('Backtest — equity curve computation', () => {
  const trades = [
    { pnl_pct: 3.2, entry_time: '2024-01-01' },
    { pnl_pct: -1.5, entry_time: '2024-01-02' },
    { pnl_pct: 2.0, entry_time: '2024-01-03' },
    { pnl_pct: -0.8, entry_time: '2024-01-04' },
  ]

  it('cumulative PnL is sum of all trades', () => {
    let cum = 0
    const curve = trades.map(t => { cum += t.pnl_pct; return cum })
    const final = curve[curve.length - 1]
    const expected = trades.reduce((s, t) => s + t.pnl_pct, 0)
    expect(final).toBeCloseTo(expected)
  })

  it('equity curve is monotone increasing on all-win series', () => {
    const wins = [1, 2, 3, 4]
    let cum = 0
    const curve = wins.map(p => { cum += p; return cum })
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i]).toBeGreaterThan(curve[i - 1])
    }
  })

  it('max drawdown computed correctly', () => {
    let equity = 0, peak = 0, maxDD = 0
    for (const t of trades) {
      equity += t.pnl_pct
      if (equity > peak) peak = equity
      const dd = peak - equity
      if (dd > maxDD) maxDD = dd
    }
    // Peak after trade 1: 3.2. After trade 2: 1.7. DD = 3.2 - 1.7 = 1.5
    expect(maxDD).toBeCloseTo(1.5)
  })

  it('profit factor is gross profit / gross loss', () => {
    const wins = trades.filter(t => t.pnl_pct > 0)
    const losses = trades.filter(t => t.pnl_pct < 0)
    const grossProfit = wins.reduce((s, t) => s + t.pnl_pct, 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl_pct, 0))
    const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit
    expect(pf).toBeCloseTo(5.2 / 2.3)
  })
})
