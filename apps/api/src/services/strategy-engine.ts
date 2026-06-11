import { supabaseAdmin } from './supabase'
import { confluenceEngine } from './confluence'
import { kimiService } from './kimi'
import { bitgetService } from './bitget'
import { paperTradingEngine } from './paper-trading'
import { alertDispatcher } from './alert-dispatcher'
import { broadcaster } from './ws-broadcaster'
import { sleep } from '@arbitex/utils'

export interface Strategy {
  id: string
  user_id: string
  name: string
  description: string | null
  enabled: boolean
  symbols: string[]
  min_confidence: 'low' | 'medium' | 'high'
  min_confluence_score: number
  required_timeframe_alignment: number
  signal_direction: 'any' | 'long' | 'short'
  auto_paper_trade: boolean
  paper_size_usdt: number
  auto_alert: boolean
  total_triggers: number
  last_triggered_at: string | null
}

const confidenceRank: Record<string, number> = { low: 0, medium: 1, high: 2 }

export class StrategyEngine {

  async getAll(userId: string): Promise<Strategy[]> {
    const { data, error } = await supabaseAdmin
      .from('strategies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as Strategy[]
  }

  async create(userId: string, params: Partial<Strategy>): Promise<Strategy> {
    const { data, error } = await supabaseAdmin
      .from('strategies')
      .insert({ user_id: userId, ...params })
      .select().single()
    if (error) throw new Error(error.message)
    return data as Strategy
  }

  async update(id: string, params: Partial<Strategy>): Promise<Strategy> {
    const { data, error } = await supabaseAdmin
      .from('strategies')
      .update(params)
      .eq('id', id)
      .select().single()
    if (error) throw new Error(error.message)
    return data as Strategy
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('strategies').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  // Evaluate a single strategy against current market
  async evaluate(strategy: Strategy): Promise<{
    triggered: boolean
    symbol?: string
    confluence?: any
    signal?: any
  }> {
    for (const symbol of strategy.symbols) {
      try {
        // 1. Run confluence
        const confluence = await confluenceEngine.analyze(symbol)

        // Direction filter
        if (strategy.signal_direction !== 'any' &&
            confluence.direction !== strategy.signal_direction) continue

        // Confluence score threshold
        if (Math.abs(confluence.composite_score) < strategy.min_confluence_score) continue

        // Alignment threshold
        if (confluence.aligned_timeframes < strategy.required_timeframe_alignment) continue

        // Confidence threshold
        if (confidenceRank[confluence.confidence] <
            confidenceRank[strategy.min_confidence]) continue

        // 2. Generate signal
        const [ticker, candles] = await Promise.all([
          bitgetService.getTicker(symbol),
          bitgetService.getCandles(symbol, '1h', 100),
        ])

        const signalData = await kimiService.generateSignal({
          symbol, ticker, candles,
          portfolio_context: `Strategy: ${strategy.name} | Confluence: ${confluence.composite_score.toFixed(2)}`,
        })

        // Confidence check on generated signal
        if (confidenceRank[signalData.confidence] <
            confidenceRank[strategy.min_confidence]) continue

        // 3. Persist signal
        const { data: saved } = await supabaseAdmin
          .from('ai_signals')
          .insert({ ...signalData, user_id: strategy.user_id })
          .select().single()

        if (!saved) continue

        broadcaster.broadcast('signal_update', saved)

        // 4. Auto paper trade
        let paperPositionId: string | undefined
        if (strategy.auto_paper_trade && saved.direction !== 'neutral') {
          try {
            const pos = await paperTradingEngine.openFromSignal(
              strategy.user_id, saved as any, strategy.paper_size_usdt
            )
            paperPositionId = pos.id
          } catch (err: any) {
            console.warn(`Strategy auto-paper trade failed: ${err.message}`)
          }
        }

        // 5. Auto alert
        if (strategy.auto_alert) {
          alertDispatcher.dispatchSignalAlert(saved as any, 'signal_generated').catch(() => {})
        }

        // 6. Log trigger
        await supabaseAdmin.from('strategy_triggers').insert({
          strategy_id: strategy.id,
          signal_id: saved.id,
          user_id: strategy.user_id,
          symbol,
          confluence_score: confluence.composite_score,
          paper_position_id: paperPositionId ?? null,
        })

        // 7. Update trigger count
        await supabaseAdmin
          .from('strategies')
          .update({
            total_triggers: strategy.total_triggers + 1,
            last_triggered_at: new Date().toISOString(),
          })
          .eq('id', strategy.id)

        return { triggered: true, symbol, confluence, signal: saved }
      } catch (err: any) {
        console.error(`Strategy eval error (${symbol}): ${err.message}`)
      }

      await sleep(300) // rate limit buffer between symbols
    }

    return { triggered: false }
  }

  // Run all enabled strategies for all users
  async runAll(): Promise<void> {
    const { data: strategies } = await supabaseAdmin
      .from('strategies')
      .select('*')
      .eq('enabled', true)

    if (!strategies?.length) return

    for (const strategy of strategies as Strategy[]) {
      await this.evaluate(strategy).catch((err) =>
        console.error(`Strategy ${strategy.id} error: ${err.message}`)
      )
      await sleep(500)
    }
  }
}

export const strategyEngine = new StrategyEngine()
