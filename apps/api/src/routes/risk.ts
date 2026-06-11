import type { FastifyPluginAsync } from 'fastify'
import { riskManager } from '../services/risk-manager'

export const riskRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/risk/profile/:userId
  app.get<{ Params: { userId: string } }>('/profile/:userId', async (req, reply) => {
    try {
      const profile = await riskManager.getOrCreateProfile(req.params.userId)
      return { success: true, data: profile, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // POST /api/risk/profile/:userId — upsert profile
  app.post<{ Params: { userId: string }; Body: Record<string, any> }>(
    '/profile/:userId', async (req, reply) => {
      try {
        const profile = await riskManager.updateProfile(req.params.userId, req.body)
        return { success: true, data: profile, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  // POST /api/risk/check — pre-trade risk check
  app.post<{
    Body: {
      user_id: string
      position_size_usdt: number
      symbol: string
      total_equity: number
    }
  }>('/check', async (req, reply) => {
    const { user_id, position_size_usdt, symbol, total_equity } = req.body
    if (!user_id || !position_size_usdt || !symbol || !total_equity) {
      return reply.status(400).send({
        success: false,
        error: 'user_id, position_size_usdt, symbol, total_equity are required',
        timestamp: Date.now(),
      })
    }
    try {
      const result = await riskManager.checkTradeAllowed(
        user_id, position_size_usdt, symbol, total_equity
      )
      return { success: true, data: result, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // GET /api/risk/dashboard/:userId
  app.get<{
    Params: { userId: string }
    Querystring: { equity?: string }
  }>('/dashboard/:userId', async (req, reply) => {
    try {
      const equity = parseFloat(req.query.equity ?? '10000')
      const dashboard = await riskManager.getDashboard(req.params.userId, equity)
      return { success: true, data: dashboard, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // POST /api/risk/reset-circuit-breaker/:userId
  app.post<{ Params: { userId: string } }>(
    '/reset-circuit-breaker/:userId', async (req, reply) => {
      try {
        const profile = await riskManager.updateProfile(req.params.userId, {
          circuit_breaker_triggered: false,
          circuit_breaker_reset_at: null,
        } as any)
        return { success: true, data: profile, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )
}
