import type { FastifyPluginAsync } from 'fastify'
import { watchlistService } from '../services/watchlist'

export const watchlistRoutes: FastifyPluginAsync = async (app) => {

  app.get<{ Params: { userId: string } }>('/:userId', async (req, reply) => {
    try {
      const items = await watchlistService.getAll(req.params.userId)
      return { success: true, data: items, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  app.post<{ Body: { user_id: string; symbol: string; note?: string } }>(
    '/', async (req, reply) => {
      const { user_id, symbol, note } = req.body
      if (!user_id || !symbol) {
        return reply.status(400).send({ success: false, error: 'user_id and symbol required', timestamp: Date.now() })
      }
      try {
        const item = await watchlistService.add(user_id, symbol, note)
        return { success: true, data: item, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  app.delete<{ Params: { userId: string; symbol: string } }>(
    '/:userId/:symbol', async (req, reply) => {
      try {
        await watchlistService.remove(req.params.userId, req.params.symbol)
        return { success: true, data: null, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  app.patch<{
    Params: { userId: string; symbol: string }
    Body: { alert_above?: number | null; alert_below?: number | null }
  }>('/:userId/:symbol/alerts', async (req, reply) => {
    try {
      const item = await watchlistService.setPriceAlerts(
        req.params.userId,
        req.params.symbol,
        req.body.alert_above,
        req.body.alert_below
      )
      return { success: true, data: item, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })
}
