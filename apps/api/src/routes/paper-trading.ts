import type { FastifyPluginAsync } from 'fastify'
import { paperTradingEngine } from '../services/paper-trading'
import { supabaseAdmin } from '../services/supabase'

export const paperTradingRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/paper/account/:userId
  app.get<{ Params: { userId: string } }>(
    '/account/:userId',
    async (req, reply) => {
      try {
        const account = await paperTradingEngine.getOrCreateAccount(req.params.userId)
        return { success: true, data: account, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  // POST /api/paper/account/:userId/reset
  app.post<{ Params: { userId: string }; Body: { balance?: number } }>(
    '/account/:userId/reset',
    async (req, reply) => {
      try {
        const account = await paperTradingEngine.resetAccount(
          req.params.userId,
          req.body.balance ?? 10000
        )
        return { success: true, data: account, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  // POST /api/paper/positions/open-signal — open from AI signal
  app.post<{
    Body: { user_id: string; signal_id: string; size_usdt: number }
  }>('/positions/open-signal', async (req, reply) => {
    const { user_id, signal_id, size_usdt } = req.body

    if (!user_id || !signal_id || !size_usdt) {
      return reply.status(400).send({
        success: false,
        error: 'user_id, signal_id, and size_usdt are required',
        timestamp: Date.now(),
      })
    }

    try {
      const { data: signal, error: sigErr } = await supabaseAdmin
        .from('ai_signals').select('*').eq('id', signal_id).single()

      if (sigErr || !signal) {
        return reply.status(404).send({ success: false, error: 'Signal not found', timestamp: Date.now() })
      }

      const position = await paperTradingEngine.openFromSignal(user_id, signal as any, size_usdt)
      return { success: true, data: position, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // POST /api/paper/positions/open — manual open
  app.post<{
    Body: {
      user_id: string
      symbol: string
      side: 'long' | 'short'
      size_usdt: number
      entry_price: number
      target_price: number
      stop_loss: number
    }
  }>('/positions/open', async (req, reply) => {
    const { user_id, symbol, side, size_usdt, entry_price, target_price, stop_loss } = req.body

    if (!user_id || !symbol || !side || !size_usdt || !entry_price || !target_price || !stop_loss) {
      return reply.status(400).send({
        success: false,
        error: 'user_id, symbol, side, size_usdt, entry_price, target_price, stop_loss are required',
        timestamp: Date.now(),
      })
    }

    try {
      const position = await paperTradingEngine.openManual(user_id, {
        symbol, side, sizeUsdt: size_usdt, entryPrice: entry_price,
        targetPrice: target_price, stopLoss: stop_loss,
      })
      return { success: true, data: position, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // POST /api/paper/positions/:id/close
  app.post<{
    Params: { id: string }
    Body: { close_price: number; action?: 'close' | 'stop' | 'target' }
  }>('/positions/:id/close', async (req, reply) => {
    try {
      const position = await paperTradingEngine.closePosition(
        req.params.id,
        req.body.close_price,
        req.body.action ?? 'close'
      )
      return { success: true, data: position, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // GET /api/paper/positions/:userId
  app.get<{
    Params: { userId: string }
    Querystring: { status?: string }
  }>('/positions/:userId', async (req, reply) => {
    try {
      const positions = await paperTradingEngine.getPositions(
        req.params.userId, req.query.status
      )
      return { success: true, data: positions, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // GET /api/paper/trades/:userId
  app.get<{
    Params: { userId: string }
    Querystring: { limit?: string }
  }>('/trades/:userId', async (req, reply) => {
    try {
      const trades = await paperTradingEngine.getTrades(
        req.params.userId, parseInt(req.query.limit ?? '50')
      )
      return { success: true, data: trades, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // GET /api/paper/summary/:userId — account + open positions + recent trades
  app.get<{ Params: { userId: string } }>(
    '/summary/:userId',
    async (req, reply) => {
      try {
        const [account, openPositions, recentTrades] = await Promise.all([
          paperTradingEngine.getOrCreateAccount(req.params.userId),
          paperTradingEngine.getPositions(req.params.userId, 'open'),
          paperTradingEngine.getTrades(req.params.userId, 10),
        ])

        const unrealizedPnl = openPositions.reduce(
          (s, p) => s + (p.unrealized_pnl_usdt ?? 0), 0
        )
        const totalEquity = account.balance_usdt + unrealizedPnl

        return {
          success: true,
          data: {
            account,
            total_equity: parseFloat(totalEquity.toFixed(4)),
            unrealized_pnl_usdt: parseFloat(unrealizedPnl.toFixed(4)),
            open_positions: openPositions,
            recent_trades: recentTrades,
          },
          timestamp: Date.now(),
        }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )
}
