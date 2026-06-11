import { supabaseAdmin } from './supabase'
import type { AISignal } from '@arbitex/types'

export interface SignalOutcome {
  signal_id: string
  user_id: string | null
  symbol: string
  direction: string
  confidence: string
  entry_price: number
  exit_price: number
  target_price: number
  stop_loss: number
  outcome: 'win' | 'loss' | 'expired'
  pnl_pct: number
  pnl_usdt: number
  risk_reward_ratio: number
  bars_held?: number
  model_used?: string
  resolved_at: string
}

export interface PerformanceSummary {
  total_signals: number
  resolved: number
  pending: number
  wins: number
  losses: number
  expired: number
  win_rate: number
  avg_win_pct: number
  avg_loss_pct: number
  total_pnl_pct: number
  profit_factor: number
  best_signal: any | null
  worst_signal: any | null
  sharpe_ratio: number
  avg_rr_ratio: number
  by_symbol: SymbolStats[]
  by_confidence: ConfidenceStats[]
  equity_curve: EquityPoint[]
}

export interface SymbolStats {
  symbol: string
  total: number
  wins: number
  win_rate: number
  total_pnl_pct: number
}

export interface ConfidenceStats {
  confidence: string
  total: number
  wins: number
  win_rate: number
  avg_pnl_pct: number
}

export interface EquityPoint {
  date: string
  cumulative_pnl_pct: number
  signal_count: number
}

// ── Tracker ─────────────────────────────────────────────────

export class PerformanceTracker {

  // Record outcome when a signal resolves (triggered, stop, expiry)
  async recordOutcome(
    signal: AISignal,
    outcome: 'win' | 'loss' | 'expired',
    exitPrice: number,
    barsHeld?: number
  ): Promise<void> {
    const isLong = signal.direction === 'long'
    const pnlPct = isLong
      ? ((exitPrice - signal.entry_price) / signal.entry_price) * 100
      : ((signal.entry_price - exitPrice) / signal.entry_price) * 100

    const pnlUsdt = (pnlPct / 100) * signal.entry_price
    const rr = Math.abs(signal.target_price - signal.entry_price) /
               Math.abs(signal.entry_price - signal.stop_loss)

    const { error } = await supabaseAdmin
      .from('signal_outcomes')
      .upsert({
        signal_id: signal.id,
        user_id: signal.user_id ?? null,
        symbol: signal.symbol,
        direction: signal.direction,
        confidence: signal.confidence,
        entry_price: signal.entry_price,
        exit_price: exitPrice,
        target_price: signal.target_price,
        stop_loss: signal.stop_loss,
        outcome,
        pnl_pct: parseFloat(pnlPct.toFixed(4)),
        pnl_usdt: parseFloat(pnlUsdt.toFixed(4)),
        risk_reward_ratio: parseFloat(rr.toFixed(4)),
        bars_held: barsHeld ?? null,
        model_used: signal.model_used ?? null,
        resolved_at: new Date().toISOString(),
      }, { onConflict: 'signal_id' })

    if (error) throw new Error(`recordOutcome error: ${error.message}`)
  }

  // Compute full performance summary for a user (or global if no userId)
  async getSummary(
    userId?: string,
    days = 30
  ): Promise<PerformanceSummary> {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()

    let query = supabaseAdmin
      .from('signal_outcomes')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    if (userId) query = query.eq('user_id', userId)

    const { data: rows, error } = await query
    if (error) throw new Error(error.message)
    const outcomes = rows ?? []

    const resolved = outcomes.filter(o => o.outcome !== 'pending')
    const wins = resolved.filter(o => o.outcome === 'win')
    const losses = resolved.filter(o => o.outcome === 'loss')
    const expired = resolved.filter(o => o.outcome === 'expired')

    const winRate = resolved.length > 0 ? (wins.length / resolved.length) * 100 : 0

    const grossProfit = wins.reduce((s: number, o: any) => s + parseFloat(o.pnl_pct), 0)
    const grossLoss = Math.abs(losses.reduce((s: number, o: any) => s + parseFloat(o.pnl_pct), 0))
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss

    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0
    const totalPnl = resolved.reduce((s: number, o: any) => s + parseFloat(o.pnl_pct), 0)
    const avgRR = resolved.length > 0
      ? resolved.reduce((s: number, o: any) => s + parseFloat(o.risk_reward_ratio || 0), 0) / resolved.length
      : 0

    // Sharpe from daily PnL series
    const pnls = resolved.map((o: any) => parseFloat(o.pnl_pct))
    const sharpe = this.sharpe(pnls)

    // Best / worst signal
    const sorted = [...resolved].sort((a: any, b: any) => parseFloat(b.pnl_pct) - parseFloat(a.pnl_pct))
    const best = sorted[0] ?? null
    const worst = sorted[sorted.length - 1] ?? null

    // By symbol
    const symbolMap = new Map<string, any[]>()
    for (const o of resolved) {
      if (!symbolMap.has(o.symbol)) symbolMap.set(o.symbol, [])
      symbolMap.get(o.symbol)!.push(o)
    }
    const bySymbol: SymbolStats[] = Array.from(symbolMap.entries()).map(([symbol, rows]) => {
      const w = rows.filter(r => r.outcome === 'win')
      return {
        symbol,
        total: rows.length,
        wins: w.length,
        win_rate: parseFloat(((w.length / rows.length) * 100).toFixed(2)),
        total_pnl_pct: parseFloat(rows.reduce((s: number, r: any) => s + parseFloat(r.pnl_pct), 0).toFixed(4)),
      }
    }).sort((a, b) => b.total_pnl_pct - a.total_pnl_pct)

    // By confidence
    const confMap = new Map<string, any[]>()
    for (const o of resolved) {
      if (!confMap.has(o.confidence)) confMap.set(o.confidence, [])
      confMap.get(o.confidence)!.push(o)
    }
    const byConfidence: ConfidenceStats[] = Array.from(confMap.entries()).map(([confidence, rows]) => {
      const w = rows.filter(r => r.outcome === 'win')
      const avgPnl = rows.reduce((s: number, r: any) => s + parseFloat(r.pnl_pct), 0) / rows.length
      return {
        confidence,
        total: rows.length,
        wins: w.length,
        win_rate: parseFloat(((w.length / rows.length) * 100).toFixed(2)),
        avg_pnl_pct: parseFloat(avgPnl.toFixed(4)),
      }
    })

    // Equity curve (cumulative PnL over time)
    let cumPnl = 0
    const equityCurve: EquityPoint[] = resolved.map((o: any) => {
      cumPnl += parseFloat(o.pnl_pct)
      return {
        date: new Date(o.resolved_at ?? o.created_at).toLocaleDateString(),
        cumulative_pnl_pct: parseFloat(cumPnl.toFixed(4)),
        signal_count: 1,
      }
    })

    return {
      total_signals: outcomes.length,
      resolved: resolved.length,
      pending: outcomes.length - resolved.length,
      wins: wins.length,
      losses: losses.length,
      expired: expired.length,
      win_rate: parseFloat(winRate.toFixed(2)),
      avg_win_pct: parseFloat(avgWin.toFixed(4)),
      avg_loss_pct: parseFloat(avgLoss.toFixed(4)),
      total_pnl_pct: parseFloat(totalPnl.toFixed(4)),
      profit_factor: parseFloat(profitFactor.toFixed(3)),
      best_signal: best,
      worst_signal: worst,
      sharpe_ratio: sharpe,
      avg_rr_ratio: parseFloat(avgRR.toFixed(3)),
      by_symbol: bySymbol,
      by_confidence: byConfidence,
      equity_curve: equityCurve,
    }
  }

  // Generate + store daily snapshot
  async snapshotDay(userId?: string): Promise<void> {
    const summary = await this.getSummary(userId, 1)
    const today = new Date().toISOString().split('T')[0]

    await supabaseAdmin.from('performance_snapshots').upsert({
      user_id: userId ?? null,
      snapshot_date: today,
      total_signals: summary.total_signals,
      wins: summary.wins,
      losses: summary.losses,
      expired: summary.expired,
      win_rate: summary.win_rate,
      total_pnl_pct: summary.total_pnl_pct,
      avg_win_pct: summary.avg_win_pct,
      avg_loss_pct: summary.avg_loss_pct,
      profit_factor: summary.profit_factor,
      best_signal_id: summary.best_signal?.signal_id ?? null,
      worst_signal_id: summary.worst_signal?.signal_id ?? null,
    }, { onConflict: 'user_id,snapshot_date' })
  }

  private sharpe(pnls: number[]): number {
    if (pnls.length < 2) return 0
    const mean = pnls.reduce((s, p) => s + p, 0) / pnls.length
    const variance = pnls.reduce((s, p) => s + (p - mean) ** 2, 0) / pnls.length
    const stddev = Math.sqrt(variance)
    if (stddev === 0) return 0
    return parseFloat(((mean / stddev) * Math.sqrt(252)).toFixed(3))
  }
}

export const performanceTracker = new PerformanceTracker()
