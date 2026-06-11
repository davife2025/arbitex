import { describe, it, expect } from 'vitest'

// ── Watchlist price alert logic ──────────────────────────────

function checkAlert(
  currentPrice: number,
  alertAbove: number | null,
  alertBelow: number | null,
  triggeredAbove: boolean,
  triggeredBelow: boolean
): { above: boolean; below: boolean } {
  return {
    above: !!(alertAbove && currentPrice >= alertAbove && !triggeredAbove),
    below: !!(alertBelow && currentPrice <= alertBelow && !triggeredBelow),
  }
}

describe('Watchlist — price alert detection', () => {
  it('triggers above alert when price crosses threshold', () => {
    const result = checkAlert(66000, 65000, null, false, false)
    expect(result.above).toBe(true)
    expect(result.below).toBe(false)
  })

  it('triggers below alert when price drops under threshold', () => {
    const result = checkAlert(63000, null, 64000, false, false)
    expect(result.above).toBe(false)
    expect(result.below).toBe(true)
  })

  it('does not re-trigger if already triggered', () => {
    const result = checkAlert(66000, 65000, null, true, false)
    expect(result.above).toBe(false)
  })

  it('triggers neither when price is between thresholds', () => {
    const result = checkAlert(65000, 67000, 63000, false, false)
    expect(result.above).toBe(false)
    expect(result.below).toBe(false)
  })

  it('triggers both simultaneously at exact threshold values', () => {
    // Degenerate case: alert_above == alert_below == current price
    const result = checkAlert(65000, 65000, 65000, false, false)
    expect(result.above).toBe(true)
    expect(result.below).toBe(true)
  })

  it('handles null thresholds gracefully', () => {
    const result = checkAlert(65000, null, null, false, false)
    expect(result.above).toBe(false)
    expect(result.below).toBe(false)
  })
})

// ── Strategy evaluation logic ────────────────────────────────

const confidenceRank: Record<string, number> = { low: 0, medium: 1, high: 2 }

function shouldStrategyTrigger(strategy: {
  min_confidence: string
  min_confluence_score: number
  required_timeframe_alignment: number
  signal_direction: string
}, confluence: {
  confidence: string
  composite_score: number
  aligned_timeframes: number
  direction: string
}): boolean {
  if (strategy.signal_direction !== 'any' && confluence.direction !== strategy.signal_direction) return false
  if (Math.abs(confluence.composite_score) < strategy.min_confluence_score) return false
  if (confluence.aligned_timeframes < strategy.required_timeframe_alignment) return false
  if (confidenceRank[confluence.confidence] < confidenceRank[strategy.min_confidence]) return false
  return true
}

const baseStrategy = {
  min_confidence: 'medium',
  min_confluence_score: 0.2,
  required_timeframe_alignment: 2,
  signal_direction: 'any',
}

const bullishConfluence = {
  confidence: 'high',
  composite_score: 0.55,
  aligned_timeframes: 3,
  direction: 'long',
}

describe('Strategy — evaluation conditions', () => {
  it('triggers when all conditions met', () => {
    expect(shouldStrategyTrigger(baseStrategy, bullishConfluence)).toBe(true)
  })

  it('blocks when confluence score too low', () => {
    expect(shouldStrategyTrigger(
      { ...baseStrategy, min_confluence_score: 0.6 },
      bullishConfluence
    )).toBe(false)
  })

  it('blocks when confidence too low', () => {
    expect(shouldStrategyTrigger(
      { ...baseStrategy, min_confidence: 'high' },
      { ...bullishConfluence, confidence: 'low' }
    )).toBe(false)
  })

  it('blocks when TF alignment insufficient', () => {
    expect(shouldStrategyTrigger(
      { ...baseStrategy, required_timeframe_alignment: 3 },
      { ...bullishConfluence, aligned_timeframes: 2 }
    )).toBe(false)
  })

  it('blocks when direction does not match', () => {
    expect(shouldStrategyTrigger(
      { ...baseStrategy, signal_direction: 'short' },
      bullishConfluence
    )).toBe(false)
  })

  it('passes direction=any for both long and short', () => {
    expect(shouldStrategyTrigger(baseStrategy, bullishConfluence)).toBe(true)
    expect(shouldStrategyTrigger(
      baseStrategy,
      { ...bullishConfluence, direction: 'short' }
    )).toBe(true)
  })

  it('blocks neutral direction signals', () => {
    expect(shouldStrategyTrigger(
      { ...baseStrategy, signal_direction: 'long' },
      { ...bullishConfluence, direction: 'neutral' }
    )).toBe(false)
  })
})

describe('Strategy — confidence ranking', () => {
  it('high > medium > low', () => {
    expect(confidenceRank['high']).toBeGreaterThan(confidenceRank['medium'])
    expect(confidenceRank['medium']).toBeGreaterThan(confidenceRank['low'])
  })

  it('medium strategy accepts high confidence signal', () => {
    expect(confidenceRank['high'] >= confidenceRank['medium']).toBe(true)
  })

  it('high strategy rejects low confidence signal', () => {
    expect(confidenceRank['low'] >= confidenceRank['high']).toBe(false)
  })
})

describe('Strategy — paper trade sizing', () => {
  it('derives position size from usdt amount and price', () => {
    const sizeUsdt = 500
    const price = 65000
    const size = sizeUsdt / price
    expect(size).toBeCloseTo(0.007692)
  })

  it('larger price = smaller position size for same USDT', () => {
    const usd = 1000
    const lowPrice = sizeForPrice(usd, 30000)
    const highPrice = sizeForPrice(usd, 60000)
    expect(lowPrice).toBeGreaterThan(highPrice)
  })

  function sizeForPrice(usd: number, price: number) {
    return usd / price
  }
})
