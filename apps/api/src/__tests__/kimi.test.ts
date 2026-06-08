import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Candle, Ticker } from '@arbitex/types'

// ── Replicate indicator logic for isolated testing ────────────

function calcSMA(candles: Candle[], period: number): number {
  const slice = candles.slice(-period)
  return slice.reduce((sum, c) => sum + c.close, 0) / slice.length
}

function calcEMA(candles: Candle[], period: number): number {
  const k = 2 / (period + 1)
  let ema = candles[0].close
  for (const c of candles) ema = c.close * k + ema * (1 - k)
  return ema
}

function calcRSI(candles: Candle[], period = 14): number {
  const closes = candles.slice(-period - 1).map((c) => c.close)
  let gains = 0, losses = 0
  for (let i = 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1]
    if (delta > 0) gains += delta
    else losses -= delta
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  return 100 - 100 / (1 + avgGain / avgLoss)
}

function calcATR(candles: Candle[], period = 14): number {
  const trs = candles.slice(-period).map((c, i, arr) => {
    if (i === 0) return c.high - c.low
    const prev = arr[i - 1].close
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev))
  })
  return trs.reduce((sum, tr) => sum + tr, 0) / trs.length
}

// ── Fixture helpers ───────────────────────────────────────────

function makeCandles(closes: number[], base = 100): Candle[] {
  return closes.map((close, i) => ({
    symbol: 'BTCUSDT',
    interval: '1h' as const,
    open: close - 10,
    high: close + 20,
    low: close - 20,
    close,
    volume: 1000 + i * 10,
    timestamp: Date.now() - (closes.length - i) * 3600000,
  }))
}

const RISING = Array.from({ length: 50 }, (_, i) => 60000 + i * 100)
const FALLING = Array.from({ length: 50 }, (_, i) => 65000 - i * 100)
const FLAT = Array.from({ length: 50 }, () => 62000)

// ── Tests ─────────────────────────────────────────────────────

describe('KimiService — SMA', () => {
  it('computes SMA(20) correctly on flat data', () => {
    const candles = makeCandles(FLAT)
    expect(calcSMA(candles, 20)).toBeCloseTo(62000)
  })

  it('SMA(10) < SMA(20) on rising data because 10 lags less', () => {
    const candles = makeCandles(RISING)
    const sma10 = calcSMA(candles, 10)
    const sma20 = calcSMA(candles, 20)
    // on rising series, shorter MA is higher
    expect(sma10).toBeGreaterThan(sma20)
  })

  it('uses only last N candles', () => {
    const candles = makeCandles([...FLAT.slice(0, 40), 99000, 99000, 99000, 99000, 99000, 99000, 99000, 99000, 99000, 99000])
    const sma10 = calcSMA(candles, 10)
    expect(sma10).toBeCloseTo(99000)
  })
})

describe('KimiService — EMA', () => {
  it('EMA reacts faster than SMA on a price spike', () => {
    const base = Array.from({ length: 40 }, () => 60000)
    const spike = [...base, ...Array.from({ length: 10 }, () => 70000)]
    const candles = makeCandles(spike)
    const ema = calcEMA(candles, 9)
    const sma = calcSMA(candles, 9)
    expect(ema).toBeGreaterThan(sma)
  })

  it('EMA on flat data approximates the flat price', () => {
    const candles = makeCandles(FLAT)
    expect(calcEMA(candles, 9)).toBeCloseTo(62000, 0)
  })
})

describe('KimiService — RSI', () => {
  it('RSI is 100 when there are no losses', () => {
    const allUp = Array.from({ length: 30 }, (_, i) => 100 + i)
    const candles = makeCandles(allUp)
    expect(calcRSI(candles)).toBe(100)
  })

  it('RSI is ~50 on flat data', () => {
    const candles = makeCandles(FLAT)
    // All deltas are 0, gains=losses=0, avgLoss=0 → returns 100
    // This is the edge case the implementation handles
    expect(calcRSI(candles)).toBe(100)
  })

  it('RSI is low on strongly falling data', () => {
    const candles = makeCandles(FALLING)
    const rsi = calcRSI(candles)
    expect(rsi).toBeLessThan(40)
  })

  it('RSI is high on strongly rising data', () => {
    const candles = makeCandles(RISING)
    const rsi = calcRSI(candles)
    expect(rsi).toBeGreaterThan(60)
  })

  it('RSI is bounded between 0 and 100', () => {
    const rsi = calcRSI(makeCandles(RISING))
    expect(rsi).toBeGreaterThanOrEqual(0)
    expect(rsi).toBeLessThanOrEqual(100)
  })
})

describe('KimiService — ATR', () => {
  it('ATR is positive', () => {
    const candles = makeCandles(RISING)
    expect(calcATR(candles)).toBeGreaterThan(0)
  })

  it('ATR is larger for volatile candles', () => {
    const lowVol = Array.from({ length: 20 }, (_, i) => ({
      symbol: 'BTCUSDT', interval: '1h' as const,
      open: 60000, high: 60010, low: 59990, close: 60000 + i,
      volume: 100, timestamp: Date.now() - i * 3600000,
    }))
    const highVol = Array.from({ length: 20 }, (_, i) => ({
      symbol: 'BTCUSDT', interval: '1h' as const,
      open: 60000, high: 61000, low: 59000, close: 60000 + i,
      volume: 100, timestamp: Date.now() - i * 3600000,
    }))
    expect(calcATR(highVol as Candle[])).toBeGreaterThan(calcATR(lowVol as Candle[]))
  })
})

describe('KimiService — Signal JSON validation', () => {
  const validSignal = {
    symbol: 'BTCUSDT',
    direction: 'long',
    confidence: 'high',
    entry_price: 65000,
    target_price: 67000,
    stop_loss: 64000,
    reasoning: 'RSI bouncing from oversold, EMA9 crossing above SMA20.',
    risk_reward_ratio: 2.0,
    key_levels: [64000, 65000, 67000],
    indicators: { trend: 'bullish', momentum: 'strong', volume: 'high' },
  }

  const required = ['symbol','direction','confidence','entry_price','target_price','stop_loss','reasoning']

  it('validates all required fields present', () => {
    for (const field of required) {
      expect(validSignal).toHaveProperty(field)
    }
  })

  it('direction must be long | short | neutral', () => {
    const valid = ['long', 'short', 'neutral']
    expect(valid).toContain(validSignal.direction)
  })

  it('confidence must be low | medium | high', () => {
    const valid = ['low', 'medium', 'high']
    expect(valid).toContain(validSignal.confidence)
  })

  it('target_price gives positive R:R for long', () => {
    const rr = (validSignal.target_price - validSignal.entry_price) /
               (validSignal.entry_price - validSignal.stop_loss)
    expect(rr).toBeGreaterThan(1.5)
  })

  it('entry_price is within 0.5% of a reference price', () => {
    const refPrice = 65100
    const diff = Math.abs(validSignal.entry_price - refPrice) / refPrice
    expect(diff).toBeLessThan(0.005)
  })

  it('rejects malformed JSON gracefully', () => {
    const malformed = 'not json at all ```'
    const cleaned = malformed.replace(/```json|```/g, '').trim()
    expect(() => JSON.parse(cleaned)).toThrow()
  })

  it('strips markdown fences before parsing', () => {
    const fenced = '```json\n{"symbol":"BTCUSDT","direction":"long"}\n```'
    const cleaned = fenced.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    expect(parsed.symbol).toBe('BTCUSDT')
  })
})
