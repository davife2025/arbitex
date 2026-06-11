import { bitgetService } from './bitget'
import type { Candle, CandleInterval, SignalDirection } from '@arbitex/types'

export type TimeframeWeight = { interval: CandleInterval; weight: number }

export interface TimeframeAnalysis {
  interval: CandleInterval
  weight: number
  direction: SignalDirection
  rsi: number
  trend: 'bullish' | 'bearish' | 'neutral'
  ema_cross: 'bullish' | 'bearish' | 'neutral'
  volume_signal: 'high' | 'normal' | 'low'
  score: number  // -1 to 1
}

export interface ConfluenceResult {
  symbol: string
  composite_score: number        // weighted -1 to 1
  direction: SignalDirection
  confidence: 'low' | 'medium' | 'high'
  aligned_timeframes: number     // how many TFs agree
  total_timeframes: number
  timeframes: TimeframeAnalysis[]
  key_support: number
  key_resistance: number
  atr: number                    // from primary timeframe (1h)
}

// ── Indicator helpers ────────────────────────────────────────

function sma(candles: Candle[], period: number): number {
  const s = candles.slice(-period)
  return s.reduce((a, c) => a + c.close, 0) / s.length
}

function ema(candles: Candle[], period: number): number {
  const k = 2 / (period + 1)
  let e = candles[0].close
  for (const c of candles) e = c.close * k + e * (1 - k)
  return e
}

function rsi(candles: Candle[], period = 14): number {
  const closes = candles.slice(-(period + 1)).map(c => c.close)
  let gains = 0, losses = 0
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    if (d > 0) gains += d; else losses -= d
  }
  const ag = gains / period, al = losses / period
  if (al === 0) return 100
  return 100 - 100 / (1 + ag / al)
}

function atr(candles: Candle[], period = 14): number {
  const trs = candles.slice(-period).map((c, i, arr) => {
    if (i === 0) return c.high - c.low
    const prev = arr[i - 1].close
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev))
  })
  return trs.reduce((s, t) => s + t, 0) / trs.length
}

function volumeSignal(candles: Candle[]): 'high' | 'normal' | 'low' {
  const recent = candles.slice(-20)
  const avg = recent.reduce((s, c) => s + c.volume, 0) / recent.length
  const cur = candles[candles.length - 1].volume
  const ratio = cur / avg
  if (ratio > 1.5) return 'high'
  if (ratio < 0.7) return 'low'
  return 'normal'
}

// Support / resistance via pivot highs/lows over last N candles
function findKeyLevels(candles: Candle[], lookback = 50): { support: number; resistance: number } {
  const slice = candles.slice(-lookback)
  const highs = slice.map(c => c.high)
  const lows = slice.map(c => c.low)
  return {
    resistance: Math.max(...highs),
    support: Math.min(...lows),
  }
}

// ── Per-timeframe scoring ────────────────────────────────────

function analyzeTimeframe(
  candles: Candle[],
  interval: CandleInterval,
  weight: number
): TimeframeAnalysis {
  if (candles.length < 30) {
    return { interval, weight, direction: 'neutral', rsi: 50, trend: 'neutral', ema_cross: 'neutral', volume_signal: 'normal', score: 0 }
  }

  const r = rsi(candles)
  const ema9 = ema(candles, 9)
  const sma20 = sma(candles, 20)
  const sma50 = candles.length >= 50 ? sma(candles, 50) : null
  const vol = volumeSignal(candles)
  const lastClose = candles[candles.length - 1].close

  // Trend score (-1 to 1)
  let trendScore = 0
  const trend = (() => {
    if (sma50) {
      if (lastClose > sma20 && sma20 > sma50) return 'bullish'
      if (lastClose < sma20 && sma20 < sma50) return 'bearish'
    } else {
      if (lastClose > sma20) return 'bullish'
      if (lastClose < sma20) return 'bearish'
    }
    return 'neutral'
  })()
  trendScore = trend === 'bullish' ? 0.4 : trend === 'bearish' ? -0.4 : 0

  // EMA cross score
  const emaCross = ema9 > sma20 ? 'bullish' : ema9 < sma20 ? 'bearish' : 'neutral'
  const emaCrossScore = emaCross === 'bullish' ? 0.3 : emaCross === 'bearish' ? -0.3 : 0

  // RSI score (-0.3 to 0.3)
  let rsiScore = 0
  if (r < 30) rsiScore = 0.3        // oversold → bullish
  else if (r < 45) rsiScore = 0.15
  else if (r > 70) rsiScore = -0.3  // overbought → bearish
  else if (r > 55) rsiScore = -0.15

  // Volume confirms direction
  const volMultiplier = vol === 'high' ? 1.2 : vol === 'low' ? 0.8 : 1.0

  const rawScore = (trendScore + emaCrossScore + rsiScore) * volMultiplier
  const score = Math.max(-1, Math.min(1, rawScore))

  const direction: SignalDirection =
    score > 0.15 ? 'long' : score < -0.15 ? 'short' : 'neutral'

  return { interval, weight, direction, rsi: r, trend, ema_cross: emaCross, volume_signal: vol, score }
}

// ── Main confluence engine ───────────────────────────────────

const TIMEFRAME_WEIGHTS: TimeframeWeight[] = [
  { interval: '1h',  weight: 0.25 },
  { interval: '4h',  weight: 0.40 },
  { interval: '1d',  weight: 0.35 },
]

export class ConfluenceEngine {
  async analyze(symbol: string): Promise<ConfluenceResult> {
    // Fetch all timeframes in parallel
    const candleResults = await Promise.all(
      TIMEFRAME_WEIGHTS.map(async ({ interval, weight }) => {
        const candles = await bitgetService.getCandles(symbol, interval, 100)
        return { candles, interval, weight }
      })
    )

    const timeframes: TimeframeAnalysis[] = candleResults.map(({ candles, interval, weight }) =>
      analyzeTimeframe(candles, interval, weight)
    )

    // Weighted composite score
    const composite_score = timeframes.reduce((sum, tf) => sum + tf.score * tf.weight, 0)

    const direction: SignalDirection =
      composite_score > 0.15 ? 'long' : composite_score < -0.15 ? 'short' : 'neutral'

    // Count aligned timeframes
    const aligned_timeframes = timeframes.filter(tf =>
      direction === 'neutral' ? tf.direction === 'neutral' : tf.direction === direction
    ).length

    // Confidence from alignment ratio + score magnitude
    const alignRatio = aligned_timeframes / timeframes.length
    const scoreMag = Math.abs(composite_score)
    const confidence: 'low' | 'medium' | 'high' =
      alignRatio >= 0.9 && scoreMag > 0.4 ? 'high'
      : alignRatio >= 0.6 && scoreMag > 0.2 ? 'medium'
      : 'low'

    // Key levels from 1h candles (primary)
    const primaryCandles = candleResults.find(r => r.interval === '1h')?.candles ?? []
    const { support, resistance } = findKeyLevels(primaryCandles)
    const primaryAtr = atr(primaryCandles)

    return {
      symbol,
      composite_score,
      direction,
      confidence,
      aligned_timeframes,
      total_timeframes: timeframes.length,
      timeframes,
      key_support: support,
      key_resistance: resistance,
      atr: primaryAtr,
    }
  }
}

export const confluenceEngine = new ConfluenceEngine()
