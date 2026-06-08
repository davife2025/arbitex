import type { FastifyPluginAsync } from 'fastify'
import { bitgetService } from '../services/bitget'
import { supabaseAdmin } from '../services/supabase'
import { broadcaster } from '../services/ws-broadcaster'

export const portfolioRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/portfolio — full portfolio snapshot
  app.get('/', async (_req, reply) => {
    try {
      const [balances, positions] = await Promise.all([
        bitgetService.getBalance(),
        bitgetService.getPositions(),
      ])

      const usdtBalance = balances.find((b) => b.currency === 'USDT')
      const unrealizedPnl = positions.reduce((sum, p) => sum + p.unrealized_pnl, 0)

      const portfolio = {
        total_equity: (usdtBalance?.total ?? 0) + unrealizedPnl,
        available_balance: usdtBalance?.available ?? 0,
        unrealized_pnl: unrealizedPnl,
        realized_pnl: 0, // TODO: aggregate from closed orders
        balances,
        positions,
        updated_at: new Date().toISOString(),
      }

      // Broadcast update to WS clients
      broadcaster.broadcast('portfolio_update', portfolio)

      return { success: true, data: portfolio, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // GET /api/portfolio/positions
  app.get('/positions', async (_req, reply) => {
    try {
      const positions = await bitgetService.getPositions()

      // Snapshot to Supabase (requires user_id — middleware will inject in Session 4)
      broadcaster.broadcast('position_update', positions)

      return { success: true, data: positions, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // GET /api/portfolio/balance
  app.get('/balance', async (_req, reply) => {
    try {
      const balances = await bitgetService.getBalance()
      return { success: true, data: balances, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })
}
