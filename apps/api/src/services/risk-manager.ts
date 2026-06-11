import { supabaseAdmin } from './supabase'
import { broadcaster } from './ws-broadcaster'

export interface RiskProfile {
  id: string
  user_id: string
  daily_loss_limit_pct: number
  daily_loss_limit_usdt: number | null
  circuit_breaker_enabled: boolean
  circuit_breaker_triggered: boolean
  circuit_breaker_reset_at: string | null
  max_open_positions: number
  max_position_size_pct: number
  max_concentration_pct: number
  max_drawdown_pct: number
  drawdown_alert_pct: number
  pause_on_high_volatility: boolean
  volatility_threshold_pct: number
}

export interface RiskCheckResult {
  allowed: boolean
  warnings: string[]
  blocks: string[]
  circuit_breaker_active: boolean
}

export class RiskManager {

  async getOrCreateProfile(userId: string): Promise<RiskProfile> {
    const { data: existing } = await supabaseAdmin
      .from('risk_profiles').select('*').eq('user_id', userId).single()
    if (existing) return existing as RiskProfile

    const { data, error } = await supabaseAdmin
      .from('risk_profiles').insert({ user_id: userId }).select().single()
    if (error) throw new Error(error.message)
    return data as RiskProfile
  }

  async updateProfile(userId: string, params: Partial<RiskProfile>): Promise<RiskProfile> {
    const { data, error } = await supabaseAdmin
      .from('risk_profiles')
      .upsert({ user_id: userId, ...params }, { onConflict: 'user_id' })
      .select().single()
    if (error) throw new Error(error.message)
    return data as RiskProfile
  }

  // Core risk check before any trade (paper or live)
  async checkTradeAllowed(
    userId: string,
    positionSizeUsdt: number,
    symbol: string,
    totalEquity: number
  ): Promise<RiskCheckResult> {
    const profile = await this.getOrCreateProfile(userId)
    const warnings: string[] = []
    const blocks: string[] = []

    // 1. Circuit breaker check
    const today = new Date().toISOString().split('T')[0]
    if (profile.circuit_breaker_enabled && profile.circuit_breaker_triggered) {
      const resetDate = profile.circuit_breaker_reset_at
      if (!resetDate || resetDate <= today) {
        // Auto-reset at start of new day
        await supabaseAdmin
          .from('risk_profiles')
          .update({ circuit_breaker_triggered: false, circuit_breaker_reset_at: null })
          .eq('user_id', userId)
      } else {
        blocks.push(`Circuit breaker active — daily loss limit hit. Resets at midnight.`)
        return { allowed: false, warnings, blocks, circuit_breaker_active: true }
      }
    }

    // 2. Daily loss check
    const { data: dailyPnl } = await supabaseAdmin
      .from('daily_pnl')
      .select('*')
      .eq('user_id', userId)
      .eq('trade_date', today)
      .single()

    if (dailyPnl) {
      const totalLoss = dailyPnl.realized_pnl_usdt + dailyPnl.unrealized_pnl_usdt
      const lossPct = Math.abs(Math.min(0, totalLoss)) / (dailyPnl.starting_equity || totalEquity) * 100

      if (lossPct >= profile.daily_loss_limit_pct) {
        if (profile.circuit_breaker_enabled) {
          await supabaseAdmin
            .from('risk_profiles')
            .update({
              circuit_breaker_triggered: true,
              circuit_breaker_reset_at: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            })
            .eq('user_id', userId)

          broadcaster.broadcast('signal_update', {
            type: 'circuit_breaker',
            user_id: userId,
            message: `Daily loss limit of ${profile.daily_loss_limit_pct}% reached. Trading paused.`,
          })
        }
        blocks.push(`Daily loss limit reached (${lossPct.toFixed(2)}% / ${profile.daily_loss_limit_pct}% max)`)
      } else if (lossPct >= profile.daily_loss_limit_pct * 0.75) {
        warnings.push(`Approaching daily loss limit: ${lossPct.toFixed(2)}% of ${profile.daily_loss_limit_pct}% limit`)
      }
    }

    // 3. Position size check
    const positionPct = (positionSizeUsdt / totalEquity) * 100
    if (positionPct > profile.max_position_size_pct) {
      blocks.push(`Position size ${positionPct.toFixed(1)}% exceeds max ${profile.max_position_size_pct}%`)
    } else if (positionPct > profile.max_position_size_pct * 0.8) {
      warnings.push(`Position size at ${positionPct.toFixed(1)}% (max: ${profile.max_position_size_pct}%)`)
    }

    // 4. Open position count check
    const { count: openCount } = await supabaseAdmin
      .from('paper_positions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'open')

    if ((openCount ?? 0) >= profile.max_open_positions) {
      blocks.push(`Max open positions reached (${openCount}/${profile.max_open_positions})`)
    } else if ((openCount ?? 0) >= profile.max_open_positions - 1) {
      warnings.push(`1 position slot remaining (${openCount}/${profile.max_open_positions})`)
    }

    // 5. Concentration check — same symbol
    const { count: symbolCount } = await supabaseAdmin
      .from('paper_positions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .eq('status', 'open')

    if ((symbolCount ?? 0) >= 2) {
      warnings.push(`Already have ${symbolCount} open positions in ${symbol}`)
    }

    const allowed = blocks.length === 0
    return { allowed, warnings, blocks, circuit_breaker_active: false }
  }

  // Record realized PnL for circuit breaker tracking
  async recordPnl(
    userId: string,
    pnlUsdt: number,
    startingEquity?: number
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0]

    const { data: existing } = await supabaseAdmin
      .from('daily_pnl').select('*').eq('user_id', userId).eq('trade_date', today).single()

    if (existing) {
      await supabaseAdmin
        .from('daily_pnl')
        .update({ realized_pnl_usdt: existing.realized_pnl_usdt + pnlUsdt })
        .eq('id', existing.id)
    } else {
      await supabaseAdmin
        .from('daily_pnl')
        .insert({
          user_id: userId,
          trade_date: today,
          realized_pnl_usdt: pnlUsdt,
          starting_equity: startingEquity ?? null,
        })
    }
  }

  // Get risk dashboard data
  async getDashboard(userId: string, totalEquity: number): Promise<{
    profile: RiskProfile
    today_pnl: any
    risk_score: number
    alerts: string[]
  }> {
    const today = new Date().toISOString().split('T')[0]
    const [profile, dailyPnlResult, openPositionsResult] = await Promise.all([
      this.getOrCreateProfile(userId),
      supabaseAdmin.from('daily_pnl').select('*').eq('user_id', userId).eq('trade_date', today).single(),
      supabaseAdmin.from('paper_positions').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('status', 'open'),
    ])

    const todayPnl = dailyPnlResult.data
    const openCount = openPositionsResult.count ?? 0
    const alerts: string[] = []

    // Compute risk score 0-100 (higher = riskier)
    let riskScore = 0

    if (todayPnl) {
      const lossPct = Math.abs(Math.min(0, todayPnl.realized_pnl_usdt)) /
        (todayPnl.starting_equity || totalEquity) * 100
      riskScore += Math.min(40, (lossPct / profile.daily_loss_limit_pct) * 40)
      if (lossPct > profile.daily_loss_limit_pct * 0.5) {
        alerts.push(`Daily loss at ${lossPct.toFixed(1)}% — limit is ${profile.daily_loss_limit_pct}%`)
      }
    }

    const positionConcentration = (openCount / profile.max_open_positions) * 100
    riskScore += Math.min(30, (positionConcentration / 100) * 30)
    if (positionConcentration > 60) {
      alerts.push(`${openCount}/${profile.max_open_positions} position slots used`)
    }

    if (profile.circuit_breaker_triggered) {
      riskScore = 100
      alerts.push('Circuit breaker active — trading paused')
    }

    return {
      profile,
      today_pnl: todayPnl,
      risk_score: Math.round(Math.min(100, riskScore)),
      alerts,
    }
  }
}

export const riskManager = new RiskManager()
