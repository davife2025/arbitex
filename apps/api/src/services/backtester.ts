import type { Candle, AISignal } from '@arbitex/types'
import { supabaseAdmin } from './supabase'

export interface BacktestSignal {
  id: string
  symbol: string
  direction: 'long' | 'short'
  entry_price: number
  target_price: number
  stop_loss: number
  created_at: string
  expires_at: string
}

export interface TradeResult {
  signal_id: string
  symbol: string
  direction: 'long' | 'short'
  entry_price: number
  exit_price: number
  exit_reason: 'target' | 'stop' | 'expired'
  pnl_pct: number
  pnl_usdt: number          // assumes 1 unit
  risk_reward_ratio: number
  bars_held: number
  entry_time: string
  exit_time: string
}

export interface BacktestResult {
  symbol: string
  period_start: string
  period_end: string
  total_signals: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  expired_trades: number
  win_rate: number
  avg_win_pct: number
  avg_loss_pct: number
  profit_factor: number     // gross profit / gross loss
  total_pnl_pct: number
  max_drawdown_pct: number
  sharpe_ratio: number
  trades: TradeResult[]
}

export class Backtester {

  // Simulate a single signal against historical candles
  private simulateTrade(
    signal: BacktestSignal,
    candles: Candle[]
  ): TradeResult | null {
    // Find candles after signal creation
    const entryTime = new Date(signal.created_at).getTime()
    const expiryTime = new Date(signal.expires_at).getTime()

    const futureCandles = candles.filter(c => c.timestamp > entryTime)
    if (futureCandles.length === 0) return null

    const isLong = signal.direction === 'long'
    let barsHeld = 0

    for (const candle of futureCandles) {
      barsHeld++

      if (candle.timestamp > expiryTime) {
        // Signal expired — exit at close
        const exitPrice = candle.close
        const pnl = isLong
          ? (exitPrice - signal.entry_price) / signal.entry_price
          : (signal.entry_price - exitPrice) / signal.entry_price

        return {
          signal_id: signal.id,
          symbol: signal.symbol,
          direction: signal.direction,
          entry_price: signal.entry_price,
          exit_price: exitPrice,
          exit_reason: 'expired',
          pnl_pct: parseFloat((pnl * 100).toFixed(4)),
          pnl_usdt: parseFloat((pnl * signal.entry_price).toFixed(4)),
          risk_reward_ratio: Math.abs(signal.target_price - signal.entry_price) /
                             Math.abs(signal.entry_price - signal.stop_loss),
          bars_held: barsHeld,
          entry_time: signal.created_at,
          exit_time: new Date(candle.timestamp).toISOString(),
        }
      }

      // Check stop loss (using candle low for long, high for short)
      const worstPrice = isLong ? candle.low : candle.high
      const hitStop = isLong
        ? worstPrice <= signal.stop_loss
        : worstPrice >= signal.stop_loss

      if (hitStop) {
        const pnl = isLong
          ? (signal.stop_loss - signal.entry_price) / signal.entry_price
          : (signal.entry_price - signal.stop_loss) / signal.entry_price

        return {
          signal_id: signal.id,
          symbol: signal.symbol,
          direction: signal.direction,
          entry_price: signal.entry_price,
          exit_price: signal.stop_loss,
          exit_reason: 'stop',
          pnl_pct: parseFloat((pnl * 100).toFixed(4)),
          pnl_usdt: parseFloat((pnl * signal.entry_price).toFixed(4)),
          risk_reward_ratio: Math.abs(signal.target_price - signal.entry_price) /
                             Math.abs(signal.entry_price - signal.stop_loss),
          bars_held: barsHeld,
          entry_time: signal.created_at,
          exit_time: new Date(candle.timestamp).toISOString(),
        }
      }

      // Check target (using candle high for long, low for short)
      const bestPrice = isLong ? candle.high : candle.low
      const hitTarget = isLong
        ? bestPrice >= signal.target_price
        : bestPrice <= signal.target_price

      if (hitTarget) {
        const pnl = isLong
          ? (signal.target_price - signal.entry_price) / signal.entry_price
          : (signal.entry_price - signal.target_price) / signal.entry_price

        return {
          signal_id: signal.id,
          symbol: signal.symbol,
          direction: signal.direction,
          entry_price: signal.entry_price,
          exit_price: signal.target_price,
          exit_reason: 'target',
          pnl_pct: parseFloat((pnl * 100).toFixed(4)),
          pnl_usdt: parseFloat((pnl * signal.entry_price).toFixed(4)),
          risk_reward_ratio: Math.abs(signal.target_price - signal.entry_price) /
                             Math.abs(signal.entry_price - signal.stop_loss),
          bars_held: barsHeld,
          entry_time: signal.created_at,
          exit_time: new Date(candle.timestamp).toISOString(),
        }
      }
    }

    return null
  }

  // Compute max drawdown from equity curve
  private maxDrawdown(trades: TradeResult[]): number {
    let equity = 0
    let peak = 0
    let maxDD = 0
    for (const t of trades) {
      equity += t.pnl_pct
      if (equity > peak) peak = equity
      const dd = peak - equity
      if (dd > maxDD) maxDD = dd
    }
    return parseFloat(maxDD.toFixed(4))
  }

  // Annualised Sharpe ratio from trade PnL series
  private sharpeRatio(trades: TradeResult[]): number {
    if (trades.length < 2) return 0
    const pnls = trades.map(t => t.pnl_pct)
    const mean = pnls.reduce((s, p) => s + p, 0) / pnls.length
    const variance = pnls.reduce((s, p) => s + (p - mean) ** 2, 0) / pnls.length
    const stddev = Math.sqrt(variance)
    if (stddev === 0) return 0
    // Annualise assuming ~6 trades/day average
    return parseFloat(((mean / stddev) * Math.sqrt(252 * 6)).toFixed(3))
  }

  async run(
    symbol: string,
    candleInterval: '1h' | '4h' | '1d' = '1h',
    lookbackDays = 30
  ): Promise<BacktestResult> {
    // 1. Fetch historical signals for this symbol from Supabase
    const since = new Date(Date.now() - lookbackDays * 24 * 3600 * 1000).toISOString()

    const { data: rawSignals, error } = await supabaseAdmin
      .from('ai_signals')
      .select('id, symbol, direction, entry_price, target_price, stop_loss, created_at, expires_at')
      .eq('symbol', symbol)
      .neq('direction', 'neutral')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    if (error) throw new Error(`Backtest DB error: ${error.message}`)

    const signals = (rawSignals ?? []) as BacktestSignal[]

    // 2. Fetch historical candles from Supabase cache
    const { data: rawCandles } = await supabaseAdmin
      .from('candles')
      .select('*')
      .eq('symbol', symbol)
      .eq('interval', candleInterval)
      .gte('candle_time', since)
      .order('candle_time', { ascending: true })

    const candles: Candle[] = (rawCandles ?? []).map((c: any) => ({
      symbol: c.symbol,
      interval: c.interval,
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
      volume: parseFloat(c.volume),
      timestamp: new Date(c.candle_time).getTime(),
    }))

    // 3. Simulate each signal
    const trades: TradeResult[] = []
    for (const signal of signals) {
      const result = this.simulateTrade(signal, candles)
      if (result) trades.push(result)
    }

    // 4. Aggregate stats
    const winning = trades.filter(t => t.exit_reason === 'target')
    const losing = trades.filter(t => t.exit_reason === 'stop')
    const expired = trades.filter(t => t.exit_reason === 'expired')

    const grossProfit = winning.reduce((s, t) => s + t.pnl_pct, 0)
    const grossLoss = Math.abs(losing.reduce((s, t) => s + t.pnl_pct, 0))
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss

    const winRate = trades.length > 0 ? winning.length / trades.length : 0
    const avgWin = winning.length > 0 ? grossProfit / winning.length : 0
    const avgLoss = losing.length > 0 ? grossLoss / losing.length : 0
    const totalPnl = trades.reduce((s, t) => s + t.pnl_pct, 0)

    const periodStart = signals[0]?.created_at ?? since
    const periodEnd = signals[signals.length - 1]?.created_at ?? new Date().toISOString()

    return {
      symbol,
      period_start: periodStart,
      period_end: periodEnd,
      total_signals: signals.length,
      total_trades: trades.length,
      winning_trades: winning.length,
      losing_trades: losing.length,
      expired_trades: expired.length,
      win_rate: parseFloat((winRate * 100).toFixed(2)),
      avg_win_pct: parseFloat(avgWin.toFixed(4)),
      avg_loss_pct: parseFloat(avgLoss.toFixed(4)),
      profit_factor: parseFloat(profitFactor.toFixed(3)),
      total_pnl_pct: parseFloat(totalPnl.toFixed(4)),
      max_drawdown_pct: this.maxDrawdown(trades),
      sharpe_ratio: this.sharpeRatio(trades),
      trades,
    }
  }
}

export const backtester = new Backtester()
