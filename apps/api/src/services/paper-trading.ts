import { supabaseAdmin } from './supabase'
import { broadcaster } from './ws-broadcaster'
import { performanceTracker } from './performance-tracker'
import { alertDispatcher } from './alert-dispatcher'
import type { AISignal } from '@arbitex/types'

export interface PaperAccount {
  id: string
  user_id: string
  balance_usdt: number
  initial_balance: number
  total_pnl_usdt: number
  total_pnl_pct: number
}

export interface PaperPosition {
  id: string
  user_id: string
  signal_id: string | null
  symbol: string
  side: 'long' | 'short'
  size: number
  entry_price: number
  current_price: number
  mark_price: number
  target_price: number
  stop_loss: number
  unrealized_pnl_usdt: number
  unrealized_pnl_pct: number
  status: 'open' | 'closed' | 'stopped' | 'targeted'
  opened_at: string
  closed_at?: string
  realized_pnl_usdt?: number
  realized_pnl_pct?: number
}

export class PaperTradingEngine {

  // ── Account management ───────────────────────────────────

  async getOrCreateAccount(userId: string, initialBalance = 10000): Promise<PaperAccount> {
    const { data: existing } = await supabaseAdmin
      .from('paper_accounts')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existing) return existing as PaperAccount

    const { data, error } = await supabaseAdmin
      .from('paper_accounts')
      .insert({ user_id: userId, balance_usdt: initialBalance, initial_balance: initialBalance })
      .select().single()

    if (error) throw new Error(`Create paper account error: ${error.message}`)
    return data as PaperAccount
  }

  async resetAccount(userId: string, newBalance = 10000): Promise<PaperAccount> {
    // Close all open positions first
    const { data: openPositions } = await supabaseAdmin
      .from('paper_positions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'open')

    for (const pos of openPositions ?? []) {
      await this.closePosition(pos.id, pos.current_price ?? pos.entry_price, 'close')
    }

    const { data, error } = await supabaseAdmin
      .from('paper_accounts')
      .update({
        balance_usdt: newBalance,
        initial_balance: newBalance,
        total_pnl_usdt: 0,
        total_pnl_pct: 0,
      })
      .eq('user_id', userId)
      .select().single()

    if (error) throw new Error(`Reset account error: ${error.message}`)
    return data as PaperAccount
  }

  // ── Open position from signal ─────────────────────────────

  async openFromSignal(
    userId: string,
    signal: AISignal,
    sizeUsdt: number
  ): Promise<PaperPosition> {
    const account = await this.getOrCreateAccount(userId)

    if (account.balance_usdt < sizeUsdt) {
      throw new Error(`Insufficient paper balance. Available: $${account.balance_usdt.toFixed(2)}`)
    }

    if (signal.direction === 'neutral') {
      throw new Error('Cannot open position from neutral signal')
    }

    const size = sizeUsdt / signal.entry_price

    // Deduct from balance
    const newBalance = account.balance_usdt - sizeUsdt
    await supabaseAdmin
      .from('paper_accounts')
      .update({ balance_usdt: newBalance })
      .eq('user_id', userId)

    // Create position
    const { data: position, error } = await supabaseAdmin
      .from('paper_positions')
      .insert({
        user_id: userId,
        signal_id: signal.id,
        symbol: signal.symbol,
        side: signal.direction as 'long' | 'short',
        size,
        entry_price: signal.entry_price,
        current_price: signal.entry_price,
        mark_price: signal.entry_price,
        target_price: signal.target_price,
        stop_loss: signal.stop_loss,
        unrealized_pnl_usdt: 0,
        unrealized_pnl_pct: 0,
        status: 'open',
      })
      .select().single()

    if (error) throw new Error(`Open position error: ${error.message}`)

    // Log the trade
    await supabaseAdmin.from('paper_trades').insert({
      user_id: userId,
      position_id: position.id,
      symbol: signal.symbol,
      side: signal.direction,
      size,
      price: signal.entry_price,
      action: 'open',
    })

    broadcaster.broadcast('position_update', { type: 'paper_open', position })

    return position as PaperPosition
  }

  // ── Open manual position ──────────────────────────────────

  async openManual(
    userId: string,
    params: {
      symbol: string
      side: 'long' | 'short'
      sizeUsdt: number
      entryPrice: number
      targetPrice: number
      stopLoss: number
    }
  ): Promise<PaperPosition> {
    const account = await this.getOrCreateAccount(userId)

    if (account.balance_usdt < params.sizeUsdt) {
      throw new Error(`Insufficient paper balance. Available: $${account.balance_usdt.toFixed(2)}`)
    }

    const size = params.sizeUsdt / params.entryPrice
    const newBalance = account.balance_usdt - params.sizeUsdt

    await supabaseAdmin
      .from('paper_accounts')
      .update({ balance_usdt: newBalance })
      .eq('user_id', userId)

    const { data: position, error } = await supabaseAdmin
      .from('paper_positions')
      .insert({
        user_id: userId,
        signal_id: null,
        symbol: params.symbol,
        side: params.side,
        size,
        entry_price: params.entryPrice,
        current_price: params.entryPrice,
        mark_price: params.entryPrice,
        target_price: params.targetPrice,
        stop_loss: params.stopLoss,
        unrealized_pnl_usdt: 0,
        unrealized_pnl_pct: 0,
        status: 'open',
      })
      .select().single()

    if (error) throw new Error(`Open manual position error: ${error.message}`)

    await supabaseAdmin.from('paper_trades').insert({
      user_id: userId,
      position_id: position.id,
      symbol: params.symbol,
      side: params.side,
      size,
      price: params.entryPrice,
      action: 'open',
    })

    broadcaster.broadcast('position_update', { type: 'paper_open', position })
    return position as PaperPosition
  }

  // ── Close position ────────────────────────────────────────

  async closePosition(
    positionId: string,
    closePrice: number,
    action: 'close' | 'stop' | 'target' = 'close'
  ): Promise<PaperPosition> {
    const { data: pos, error: fetchErr } = await supabaseAdmin
      .from('paper_positions')
      .select('*')
      .eq('id', positionId)
      .single()

    if (fetchErr || !pos) throw new Error('Position not found')
    if (pos.status !== 'open') throw new Error('Position already closed')

    const isLong = pos.side === 'long'
    const pnlPct = isLong
      ? ((closePrice - pos.entry_price) / pos.entry_price) * 100
      : ((pos.entry_price - closePrice) / pos.entry_price) * 100
    const pnlUsdt = (pnlPct / 100) * (pos.size * pos.entry_price)

    const statusMap = { close: 'closed', stop: 'stopped', target: 'targeted' } as const
    const newStatus = statusMap[action]

    // Return size value to account
    const returnValue = pos.size * closePrice
    const { data: account } = await supabaseAdmin
      .from('paper_accounts')
      .select('*')
      .eq('user_id', pos.user_id)
      .single()

    if (account) {
      const newBalance = account.balance_usdt + returnValue
      const newTotalPnl = account.total_pnl_usdt + pnlUsdt
      const newTotalPnlPct = ((newTotalPnl) / account.initial_balance) * 100

      await supabaseAdmin
        .from('paper_accounts')
        .update({
          balance_usdt: newBalance,
          total_pnl_usdt: newTotalPnl,
          total_pnl_pct: newTotalPnlPct,
        })
        .eq('user_id', pos.user_id)
    }

    // Update position
    const { data: updated } = await supabaseAdmin
      .from('paper_positions')
      .update({
        status: newStatus,
        close_price: closePrice,
        realized_pnl_usdt: parseFloat(pnlUsdt.toFixed(4)),
        realized_pnl_pct: parseFloat(pnlPct.toFixed(4)),
        closed_at: new Date().toISOString(),
      })
      .eq('id', positionId)
      .select().single()

    // Log trade
    await supabaseAdmin.from('paper_trades').insert({
      user_id: pos.user_id,
      position_id: positionId,
      symbol: pos.symbol,
      side: pos.side,
      size: pos.size,
      price: closePrice,
      action,
      pnl_usdt: parseFloat(pnlUsdt.toFixed(4)),
      pnl_pct: parseFloat(pnlPct.toFixed(4)),
    })

    broadcaster.broadcast('position_update', { type: 'paper_close', position: updated })

    // Record in performance tracker if linked to a signal
    if (pos.signal_id) {
      const { data: signal } = await supabaseAdmin
        .from('ai_signals').select('*').eq('id', pos.signal_id).single()
      if (signal) {
        const outcome = action === 'target' ? 'win' : action === 'stop' ? 'loss' : 'expired'
        performanceTracker.recordOutcome(signal as any, outcome, closePrice).catch(() => {})
      }
    }

    // Alert on stop / target
    if (pos.signal_id && (action === 'stop' || action === 'target')) {
      const { data: signal } = await supabaseAdmin
        .from('ai_signals').select('*').eq('id', pos.signal_id).single()
      if (signal) {
        alertDispatcher
          .dispatchPositionAlert(
            pos.user_id, pos.symbol,
            action === 'target' ? 'target_hit' : 'stop_hit',
            pos.entry_price, closePrice, pnlPct
          )
          .catch(() => {})
      }
    }

    return updated as PaperPosition
  }

  // ── Mark-to-market update ─────────────────────────────────

  async markToMarket(symbol: string, currentPrice: number): Promise<void> {
    const { data: positions } = await supabaseAdmin
      .from('paper_positions')
      .select('*')
      .eq('symbol', symbol)
      .eq('status', 'open')

    if (!positions?.length) return

    for (const pos of positions) {
      const isLong = pos.side === 'long'
      const pnlPct = isLong
        ? ((currentPrice - pos.entry_price) / pos.entry_price) * 100
        : ((pos.entry_price - currentPrice) / pos.entry_price) * 100
      const pnlUsdt = (pnlPct / 100) * (pos.size * pos.entry_price)

      // Check stop / target
      const hitStop = isLong
        ? currentPrice <= pos.stop_loss
        : currentPrice >= pos.stop_loss
      const hitTarget = isLong
        ? currentPrice >= pos.target_price
        : currentPrice <= pos.target_price

      if (hitStop) {
        await this.closePosition(pos.id, pos.stop_loss, 'stop')
      } else if (hitTarget) {
        await this.closePosition(pos.id, pos.target_price, 'target')
      } else {
        // Update unrealized PnL
        await supabaseAdmin
          .from('paper_positions')
          .update({
            current_price: currentPrice,
            mark_price: currentPrice,
            unrealized_pnl_usdt: parseFloat(pnlUsdt.toFixed(4)),
            unrealized_pnl_pct: parseFloat(pnlPct.toFixed(4)),
          })
          .eq('id', pos.id)
      }
    }
  }

  // ── Getters ───────────────────────────────────────────────

  async getPositions(userId: string, status?: string): Promise<PaperPosition[]> {
    let query = supabaseAdmin
      .from('paper_positions')
      .select('*')
      .eq('user_id', userId)
      .order('opened_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data } = await query
    return (data ?? []) as PaperPosition[]
  }

  async getTrades(userId: string, limit = 50): Promise<any[]> {
    const { data } = await supabaseAdmin
      .from('paper_trades')
      .select('*')
      .eq('user_id', userId)
      .order('executed_at', { ascending: false })
      .limit(limit)
    return data ?? []
  }
}

export const paperTradingEngine = new PaperTradingEngine()
