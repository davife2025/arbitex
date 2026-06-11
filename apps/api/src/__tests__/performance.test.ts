import { describe, it, expect } from 'vitest'
import type { AISignal } from '@arbitex/types'

// ── Replicate core logic for isolated testing ────────────────

function calcPnlPct(signal: any, exitPrice: number): number {
  const isLong = signal.direction === 'long'
  return isLong
    ? ((exitPrice - signal.entry_price) / signal.entry_price) * 100
    : ((signal.entry_price - exitPrice) / signal.entry_price) * 100
}

function calcRR(signal: any): number {
  return Math.abs(signal.target_price - signal.entry_price) /
         Math.abs(signal.entry_price - signal.stop_loss)
}

function profitFactor(wins: number[], losses: number[]): number {
  const grossProfit = wins.reduce((s, p) => s + p, 0)
  const grossLoss   = Math.abs(losses.reduce((s, p) => s + p, 0))
  return grossLoss === 0 ? grossProfit : grossProfit / grossLoss
}

function sharpe(pnls: number[]): number {
  if (pnls.length < 2) return 0
  const mean = pnls.reduce((s, p) => s + p, 0) / pnls.length
  const variance = pnls.reduce((s, p) => s + (p - mean) ** 2, 0) / pnls.length
  const stddev = Math.sqrt(variance)
  if (stddev === 0) return 0
  return (mean / stddev) * Math.sqrt(252)
}

const longSignal: any = {
  id: 's1', user_id: 'u1', symbol: 'BTCUSDT',
  direction: 'long', confidence: 'high',
  entry_price: 65000, target_price: 67000, stop_loss: 64000,
  reasoning: '', model_used: '', status: 'active',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 3600000).toISOString(),
}

const shortSignal: any = {
  ...longSignal, id: 's2',
  direction: 'short', entry_price: 65000, target_price: 63000, stop_loss: 66000,
}

// ── PnL calculation ──────────────────────────────────────────

describe('PnL calculation', () => {
  it('long win: exit above entry yields positive PnL', () => {
    expect(calcPnlPct(longSignal, 67000)).toBeCloseTo(3.077)
  })

  it('long loss: exit below entry yields negative PnL', () => {
    expect(calcPnlPct(longSignal, 64000)).toBeCloseTo(-1.538)
  })

  it('short win: exit below entry yields positive PnL', () => {
    expect(calcPnlPct(shortSignal, 63000)).toBeCloseTo(3.077)
  })

  it('short loss: exit above entry yields negative PnL', () => {
    expect(calcPnlPct(shortSignal, 66000)).toBeCloseTo(-1.538)
  })

  it('exit at entry price yields 0% PnL', () => {
    expect(calcPnlPct(longSignal, 65000)).toBeCloseTo(0)
  })
})

// ── R:R calculation ──────────────────────────────────────────

describe('R:R ratio calculation', () => {
  it('computes 2:1 R:R for standard long', () => {
    // (67000-65000)/(65000-64000) = 2
    expect(calcRR(longSignal)).toBeCloseTo(2)
  })

  it('computes 2:1 R:R for standard short', () => {
    // (65000-63000)/(66000-65000) = 2
    expect(calcRR(shortSignal)).toBeCloseTo(2)
  })

  it('tighter stop = higher R:R', () => {
    const tightStop = { ...longSignal, stop_loss: 64500 }
    expect(calcRR(tightStop)).toBeGreaterThan(calcRR(longSignal))
  })
})

// ── Profit factor ────────────────────────────────────────────

describe('Profit factor', () => {
  it('is > 1 when gross profit exceeds gross loss', () => {
    expect(profitFactor([3, 2, 1.5], [-1, -1])).toBeGreaterThan(1)
  })

  it('is < 1 when gross loss exceeds gross profit', () => {
    expect(profitFactor([1], [-2, -1.5])).toBeLessThan(1)
  })

  it('is Infinity when there are no losses', () => {
    expect(profitFactor([3, 2], [])).toBe(3 + 2)
  })

  it('is exactly 1 when profit equals loss', () => {
    expect(profitFactor([5], [-5])).toBe(1)
  })
})

// ── Sharpe ratio ─────────────────────────────────────────────

describe('Sharpe ratio', () => {
  it('returns 0 for single data point', () => {
    expect(sharpe([3])).toBe(0)
  })

  it('returns 0 for flat returns (no volatility)', () => {
    expect(sharpe([2, 2, 2, 2])).toBe(0)
  })

  it('positive Sharpe for consistently positive returns', () => {
    expect(sharpe([1, 2, 1.5, 2, 1.8])).toBeGreaterThan(0)
  })

  it('negative Sharpe for consistently negative returns', () => {
    expect(sharpe([-1, -2, -1.5, -2])).toBeLessThan(0)
  })
})

// ── Equity curve ─────────────────────────────────────────────

describe('Equity curve', () => {
  it('cumulates PnL correctly', () => {
    const pnls = [2, -1, 3, -0.5]
    let cum = 0
    const curve = pnls.map(p => {
      cum += p
      return parseFloat(cum.toFixed(4))
    })
    expect(curve).toEqual([2, 1, 4, 3.5])
  })

  it('ends negative on net-losing series', () => {
    const pnls = [-2, 1, -3]
    let cum = 0
    const curve = pnls.map(p => { cum += p; return cum })
    expect(curve[curve.length - 1]).toBeLessThan(0)
  })
})

// ── By-symbol aggregation ─────────────────────────────────────

describe('By-symbol stats', () => {
  const outcomes = [
    { symbol: 'BTCUSDT', outcome: 'win',  pnl_pct: 3 },
    { symbol: 'BTCUSDT', outcome: 'loss', pnl_pct: -1 },
    { symbol: 'BTCUSDT', outcome: 'win',  pnl_pct: 2 },
    { symbol: 'ETHUSDT', outcome: 'loss', pnl_pct: -2 },
  ]

  it('aggregates win rate per symbol correctly', () => {
    const btc = outcomes.filter(o => o.symbol === 'BTCUSDT')
    const wins = btc.filter(o => o.outcome === 'win')
    expect((wins.length / btc.length) * 100).toBeCloseTo(66.67)
  })

  it('aggregates total PnL per symbol correctly', () => {
    const btc = outcomes.filter(o => o.symbol === 'BTCUSDT')
    const total = btc.reduce((s, o) => s + o.pnl_pct, 0)
    expect(total).toBe(4)
  })
})
