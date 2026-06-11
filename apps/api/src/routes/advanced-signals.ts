import type { FastifyPluginAsync } from 'fastify'
import { confluenceEngine } from '../services/confluence'
import { positionSizer } from '../services/position-sizer'
import { backtester } from '../services/backtester'
import { bitgetService } from '../services/bitget'
import { kimiService } from '../services/kimi'
import { supabaseAdmin } from '../services/supabase'
import { broadcaster } from '../services/ws-broadcaster'
import type { CandleInterval } from '@arbitex/types'

export const advancedSignalRoutes: FastifyPluginAsync = async (app) => {

  // POST /api/signals/advanced — confluence + Kimi + position sizing in one call
  app.post<{
    Body: {
      symbol: string
      user_id?: string
      max_risk_pct?: number
    }
  }>('/advanced', async (req, reply) => {
    const { symbol, user_id, max_risk_pct = 0.01 } = req.body

    if (!symbol) {
      return reply.status(400).send({ success: false, error: 'symbol is required', timestamp: Date.now() })
    }

    try {
      const sym = symbol.toUpperCase()

      // 1. Run multi-timeframe confluence
      app.log.info(`Running confluence for ${sym}`)
      const confluence = await confluenceEngine.analyze(sym)

      // 2. If neutral — return early with confluence data only
      if (confluence.direction === 'neutral') {
        return {
          success: true,
          data: { confluence, signal: null, sizing: null, message: 'Market neutral — no signal generated' },
          timestamp: Date.now(),
        }
      }

      // 3. Fetch 1h candles + ticker for Kimi
      const [ticker, candles] = await Promise.all([
        bitgetService.getTicker(sym),
        bitgetService.getCandles(sym, '1h', 100),
      ])

      // Build rich portfolio context from confluence
      const portfolioContext = [
        `Multi-timeframe confluence score: ${confluence.composite_score.toFixed(3)} (${confluence.direction})`,
        `Timeframe alignment: ${confluence.aligned_timeframes}/${confluence.total_timeframes} agree`,
        `Key support: ${confluence.key_support}`,
        `Key resistance: ${confluence.key_resistance}`,
        `ATR(14): ${confluence.atr.toFixed(4)}`,
        confluence.timeframes.map(tf =>
          `${tf.interval}: RSI=${tf.rsi.toFixed(1)}, trend=${tf.trend}, score=${tf.score.toFixed(3)}`
        ).join(' | '),
      ].join('\n')

      // 4. Generate Kimi signal enriched with confluence context
      const kimiSignal = await kimiService.generateSignal({
        symbol: sym, ticker, candles, portfolio_context: portfolioContext,
      })

      // 5. Position sizing — fetch portfolio first
      const portfolio = await bitgetService.getBalance()
      const usdtBal = portfolio.find(b => b.currency === 'USDT')
      const mockPortfolio = {
        user_id: user_id ?? '',
        total_equity: usdtBal?.total ?? 1000,
        available_balance: usdtBal?.available ?? 1000,
        unrealized_pnl: 0,
        realized_pnl: 0,
        positions: [],
        updated_at: new Date().toISOString(),
      }

      const sizing = positionSizer.size({
        confluence,
        portfolio: mockPortfolio,
        entry_price: kimiSignal.entry_price,
        stop_loss: kimiSignal.stop_loss,
        target_price: kimiSignal.target_price,
        max_risk_pct,
      })

      // 6. Persist enriched signal
      const { data: saved } = await supabaseAdmin
        .from('ai_signals')
        .insert({
          ...kimiSignal,
          user_id: user_id ?? null,
          // Store sizing + confluence in reasoning suffix
          reasoning: [
            kimiSignal.reasoning,
            `[Size: ${sizing.recommended_size} @ ${(sizing.risk_pct_of_equity).toFixed(2)}% risk]`,
            `[Confluence: ${confluence.aligned_timeframes}/${confluence.total_timeframes} TFs, score ${confluence.composite_score.toFixed(2)}]`,
          ].join(' '),
        })
        .select()
        .single()

      if (saved) broadcaster.broadcast('signal_update', saved)

      return {
        success: true,
        data: { confluence, signal: saved, sizing },
        timestamp: Date.now(),
      }
    } catch (err: any) {
      app.log.error(`Advanced signal error: ${err.message}`)
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // GET /api/signals/confluence/:symbol — confluence only, no Kimi call
  app.get<{ Params: { symbol: string } }>(
    '/confluence/:symbol',
    async (req, reply) => {
      try {
        const confluence = await confluenceEngine.analyze(req.params.symbol.toUpperCase())
        return { success: true, data: confluence, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  // POST /api/signals/size — position sizing only (given existing signal data)
  app.post<{
    Body: {
      symbol: string
      entry_price: number
      stop_loss: number
      target_price: number
      portfolio_equity: number
      portfolio_available: number
      confidence?: 'low' | 'medium' | 'high'
      max_risk_pct?: number
    }
  }>('/size', async (req, reply) => {
    const { symbol, entry_price, stop_loss, target_price, portfolio_equity, portfolio_available, confidence = 'medium', max_risk_pct = 0.01 } = req.body

    if (!entry_price || !stop_loss || !target_price || !portfolio_equity) {
      return reply.status(400).send({
        success: false,
        error: 'entry_price, stop_loss, target_price, portfolio_equity are required',
        timestamp: Date.now(),
      })
    }

    try {
      // Lightweight confluence stub when called standalone
      const direction = entry_price < target_price ? 'long' as const : 'short' as const
      const stubConfluence = {
        symbol,
        composite_score: confidence === 'high' ? 0.5 : confidence === 'medium' ? 0.3 : 0.1,
        direction,
        confidence,
        aligned_timeframes: confidence === 'high' ? 3 : confidence === 'medium' ? 2 : 1,
        total_timeframes: 3,
        timeframes: [],
        key_support: stop_loss,
        key_resistance: target_price,
        atr: Math.abs(entry_price - stop_loss),
      }

      const sizing = positionSizer.size({
        confluence: stubConfluence,
        portfolio: {
          user_id: '',
          total_equity: portfolio_equity,
          available_balance: portfolio_available,
          unrealized_pnl: 0, realized_pnl: 0,
          positions: [], updated_at: new Date().toISOString(),
        },
        entry_price, stop_loss, target_price, max_risk_pct,
      })

      return { success: true, data: sizing, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // GET /api/signals/backtest/:symbol — run backtest on stored signals
  app.get<{
    Params: { symbol: string }
    Querystring: { interval?: string; days?: string }
  }>('/backtest/:symbol', async (req, reply) => {
    const { symbol } = req.params
    const interval = (req.query.interval ?? '1h') as '1h' | '4h' | '1d'
    const days = parseInt(req.query.days ?? '30')

    if (days > 90) {
      return reply.status(400).send({
        success: false,
        error: 'Max lookback is 90 days',
        timestamp: Date.now(),
      })
    }

    try {
      const result = await backtester.run(symbol.toUpperCase(), interval, days)
      return { success: true, data: result, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // GET /api/signals/backtest-summary — backtest all tracked symbols
  app.get('/backtest-summary', async (_req, reply) => {
    const TOP_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']
    try {
      const results = await Promise.allSettled(
        TOP_SYMBOLS.map(sym => backtester.run(sym, '1h', 30))
      )
      const data = results
        .map((r, i) => r.status === 'fulfilled'
          ? { symbol: TOP_SYMBOLS[i], ...r.value }
          : { symbol: TOP_SYMBOLS[i], error: (r as any).reason?.message }
        )
      return { success: true, data, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })
}
