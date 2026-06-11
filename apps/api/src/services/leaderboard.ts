import { supabaseAdmin } from './supabase'
import { performanceTracker } from './performance-tracker'

export interface LeaderboardEntry {
  id: string
  user_id: string
  display_name: string
  avatar_color: string
  is_public: boolean
  paper_total_return_pct: number
  paper_win_rate: number
  paper_total_trades: number
  paper_profit_factor: number
  paper_sharpe: number
  paper_max_drawdown_pct: number
  signal_win_rate: number
  signal_total: number
  signal_avg_rr: number
  rank: number | null
  rank_change: number
  snapshot_date: string
  updated_at: string
}

export interface LeaderboardConfig {
  display_name?: string
  avatar_color?: string
  is_public?: boolean
}

export class LeaderboardService {

  // Get top N public entries
  async getTop(limit = 20, sortBy: 'return' | 'win_rate' | 'sharpe' = 'return'): Promise<LeaderboardEntry[]> {
    const sortColumn: Record<string, string> = {
      return:   'paper_total_return_pct',
      win_rate: 'paper_win_rate',
      sharpe:   'paper_sharpe',
    }

    const { data, error } = await supabaseAdmin
      .from('leaderboard')
      .select('*')
      .eq('is_public', true)
      .order(sortColumn[sortBy], { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return (data ?? []) as LeaderboardEntry[]
  }

  // Get a user's own entry (even if private)
  async getMyEntry(userId: string): Promise<LeaderboardEntry | null> {
    const { data } = await supabaseAdmin
      .from('leaderboard')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    return data as LeaderboardEntry | null
  }

  // Update display settings (opt-in to public)
  async updateConfig(userId: string, config: LeaderboardConfig): Promise<LeaderboardEntry> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabaseAdmin
      .from('leaderboard')
      .upsert({
        user_id: userId,
        snapshot_date: today,
        display_name: config.display_name ?? 'Trader',
        avatar_color: config.avatar_color ?? '#00E5FF',
        is_public: config.is_public ?? false,
      }, { onConflict: 'user_id,snapshot_date' })
      .select().single()

    if (error) throw new Error(error.message)
    return data as LeaderboardEntry
  }

  // Snapshot a user's stats onto the leaderboard
  async snapshotUser(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0]

    // Fetch performance summary
    const summary = await performanceTracker.getSummary(userId, 30)

    // Fetch paper trading summary
    const { data: paperAccount } = await supabaseAdmin
      .from('paper_accounts')
      .select('*')
      .eq('user_id', userId)
      .single()

    const { data: closedPositions } = await supabaseAdmin
      .from('paper_positions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['closed', 'stopped', 'targeted'])

    const positions = closedPositions ?? []
    const wins = positions.filter(p => p.status === 'targeted').length
    const total = positions.length
    const winRate = total > 0 ? (wins / total) * 100 : 0

    const grossProfit = positions
      .filter(p => (p.realized_pnl_pct ?? 0) > 0)
      .reduce((s: number, p: any) => s + parseFloat(p.realized_pnl_pct ?? 0), 0)
    const grossLoss = Math.abs(positions
      .filter(p => (p.realized_pnl_pct ?? 0) < 0)
      .reduce((s: number, p: any) => s + parseFloat(p.realized_pnl_pct ?? 0), 0))
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit

    const totalReturn = paperAccount
      ? ((paperAccount.total_pnl_usdt / paperAccount.initial_balance) * 100)
      : 0

    // Compute max drawdown from paper positions
    let peak = 0, maxDD = 0, equity = 0
    for (const p of positions) {
      equity += parseFloat(p.realized_pnl_pct ?? 0)
      if (equity > peak) peak = equity
      const dd = peak - equity
      if (dd > maxDD) maxDD = dd
    }

    // Get yesterday's rank to compute rank_change
    const { data: yesterday } = await supabaseAdmin
      .from('leaderboard')
      .select('rank')
      .eq('user_id', userId)
      .lt('snapshot_date', today)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    const { data: existing } = await supabaseAdmin
      .from('leaderboard')
      .select('rank, is_public, display_name, avatar_color')
      .eq('user_id', userId)
      .eq('snapshot_date', today)
      .single()

    await supabaseAdmin.from('leaderboard').upsert({
      user_id: userId,
      snapshot_date: today,
      is_public: existing?.is_public ?? false,
      display_name: existing?.display_name ?? 'Trader',
      avatar_color: existing?.avatar_color ?? '#00E5FF',
      paper_total_return_pct: parseFloat(totalReturn.toFixed(4)),
      paper_win_rate: parseFloat(winRate.toFixed(2)),
      paper_total_trades: total,
      paper_profit_factor: parseFloat(profitFactor.toFixed(3)),
      paper_sharpe: summary.sharpe_ratio,
      paper_max_drawdown_pct: parseFloat(maxDD.toFixed(3)),
      signal_win_rate: summary.win_rate,
      signal_total: summary.total_signals,
      signal_avg_rr: summary.avg_rr_ratio,
      rank_change: yesterday?.rank ? (existing?.rank ?? 0) - yesterday.rank : 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,snapshot_date' })

    // Recompute global rankings for public entries
    await this.recomputeRanks()
  }

  private async recomputeRanks(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const { data: entries } = await supabaseAdmin
      .from('leaderboard')
      .select('id, paper_total_return_pct')
      .eq('snapshot_date', today)
      .eq('is_public', true)
      .order('paper_total_return_pct', { ascending: false })

    if (!entries) return

    for (let i = 0; i < entries.length; i++) {
      await supabaseAdmin
        .from('leaderboard')
        .update({ rank: i + 1 })
        .eq('id', entries[i].id)
    }
  }
}

export const leaderboardService = new LeaderboardService()
