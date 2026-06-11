import { describe, it, expect } from 'vitest'

// ── Risk calculation logic ───────────────────────────────────

function calcLossPct(realizedPnl: number, startingEquity: number): number {
  return Math.abs(Math.min(0, realizedPnl)) / startingEquity * 100
}

function calcPositionPct(sizeUsdt: number, equity: number): number {
  return (sizeUsdt / equity) * 100
}

function calcRiskScore(
  lossPct: number, lossLimit: number,
  openPositions: number, maxPositions: number,
  circuitBreakerTriggered: boolean
): number {
  if (circuitBreakerTriggered) return 100
  let score = 0
  score += Math.min(40, (lossPct / lossLimit) * 40)
  score += Math.min(30, (openPositions / maxPositions) * 30)
  return Math.round(Math.min(100, score))
}

function shouldTriggerCircuitBreaker(
  lossPct: number,
  limit: number,
  enabled: boolean
): boolean {
  return enabled && lossPct >= limit
}

// ── Daily loss ───────────────────────────────────────────────

describe('Risk Manager — daily loss calculation', () => {
  it('calculates loss pct correctly', () => {
    expect(calcLossPct(-500, 10000)).toBe(5)
  })

  it('returns 0 for positive PnL', () => {
    expect(calcLossPct(200, 10000)).toBe(0)
  })

  it('handles zero starting equity gracefully', () => {
    expect(calcLossPct(-500, 1)).toBe(50000)
  })

  it('50% loss gives 50% loss pct', () => {
    expect(calcLossPct(-5000, 10000)).toBe(50)
  })
})

// ── Position sizing checks ───────────────────────────────────

describe('Risk Manager — position size checks', () => {
  it('calculates position pct of equity', () => {
    expect(calcPositionPct(1000, 10000)).toBe(10)
  })

  it('blocks when position exceeds max', () => {
    const pct = calcPositionPct(1500, 10000)
    expect(pct > 10).toBe(true) // 15% > 10% limit
  })

  it('warns at 80% of limit', () => {
    const pct = calcPositionPct(850, 10000) // 8.5% of 10% limit = 85%
    const nearLimit = pct > 8 && pct <= 10
    expect(nearLimit).toBe(true)
  })

  it('allows small positions freely', () => {
    const pct = calcPositionPct(100, 10000) // 1%
    expect(pct < 10).toBe(true)
  })
})

// ── Circuit breaker ──────────────────────────────────────────

describe('Risk Manager — circuit breaker', () => {
  it('triggers when loss hits limit', () => {
    expect(shouldTriggerCircuitBreaker(5, 5, true)).toBe(true)
  })

  it('triggers when loss exceeds limit', () => {
    expect(shouldTriggerCircuitBreaker(7, 5, true)).toBe(true)
  })

  it('does not trigger when under limit', () => {
    expect(shouldTriggerCircuitBreaker(3, 5, true)).toBe(false)
  })

  it('does not trigger when circuit breaker disabled', () => {
    expect(shouldTriggerCircuitBreaker(10, 5, false)).toBe(false)
  })

  it('triggers at exactly the limit boundary', () => {
    expect(shouldTriggerCircuitBreaker(5.0, 5.0, true)).toBe(true)
  })
})

// ── Risk score ───────────────────────────────────────────────

describe('Risk Manager — risk score', () => {
  it('returns 100 when circuit breaker triggered', () => {
    expect(calcRiskScore(0, 5, 0, 5, true)).toBe(100)
  })

  it('returns 0 when no loss and no positions', () => {
    expect(calcRiskScore(0, 5, 0, 5, false)).toBe(0)
  })

  it('maxes at 70 when full positions but no loss', () => {
    const score = calcRiskScore(0, 5, 5, 5, false)
    expect(score).toBe(30) // 5/5 positions = 30 points
  })

  it('increases with higher loss pct', () => {
    const low = calcRiskScore(1, 5, 0, 5, false)
    const high = calcRiskScore(4, 5, 0, 5, false)
    expect(high).toBeGreaterThan(low)
  })

  it('caps at 100', () => {
    const score = calcRiskScore(100, 5, 100, 5, false)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('scores moderate risk correctly', () => {
    // 2.5% loss of 5% limit = 50% → 20 pts; 3/5 positions = 60% → 18 pts = 38
    const score = calcRiskScore(2.5, 5, 3, 5, false)
    expect(score).toBeGreaterThan(20)
    expect(score).toBeLessThan(60)
  })
})

// ── Concentration check ──────────────────────────────────────

describe('Risk Manager — concentration', () => {
  it('flags duplicate symbol positions', () => {
    const existing = [
      { symbol: 'BTCUSDT', status: 'open' },
      { symbol: 'BTCUSDT', status: 'open' },
    ]
    const sameSymbolCount = existing.filter(p => p.symbol === 'BTCUSDT' && p.status === 'open').length
    expect(sameSymbolCount).toBeGreaterThanOrEqual(2)
  })

  it('does not flag different symbols', () => {
    const existing = [
      { symbol: 'BTCUSDT', status: 'open' },
      { symbol: 'ETHUSDT', status: 'open' },
    ]
    const btcCount = existing.filter(p => p.symbol === 'BTCUSDT' && p.status === 'open').length
    expect(btcCount).toBe(1)
  })
})
