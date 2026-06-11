import type { FastifyPluginAsync } from 'fastify'
import { leaderboardService } from '../services/leaderboard'

export const leaderboardRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/leaderboard?sort=return&limit=20
  app.get<{ Querystring: { sort?: string; limit?: string } }>(
    '/', async (req, reply) => {
      try {
        const sort = (req.query.sort ?? 'return') as 'return' | 'win_rate' | 'sharpe'
        const limit = parseInt(req.query.limit ?? '20')
        const entries = await leaderboardService.getTop(limit, sort)
        return { success: true, data: entries, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  // GET /api/leaderboard/me/:userId
  app.get<{ Params: { userId: string } }>(
    '/me/:userId', async (req, reply) => {
      try {
        const entry = await leaderboardService.getMyEntry(req.params.userId)
        return { success: true, data: entry, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  // POST /api/leaderboard/config/:userId — opt-in / update display name
  app.post<{
    Params: { userId: string }
    Body: { display_name?: string; avatar_color?: string; is_public?: boolean }
  }>('/config/:userId', async (req, reply) => {
    try {
      const entry = await leaderboardService.updateConfig(req.params.userId, req.body)
      return { success: true, data: entry, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // POST /api/leaderboard/snapshot/:userId — manual snapshot
  app.post<{ Params: { userId: string } }>(
    '/snapshot/:userId', async (req, reply) => {
      try {
        await leaderboardService.snapshotUser(req.params.userId)
        return { success: true, data: null, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )
}
