import type { FastifyPluginAsync } from 'fastify'
import { rateLimitTracker } from '../services/rate-limit-tracker'

export const rateLimitRoutes: FastifyPluginAsync = async (app) => {

  app.get('/stats', async (_req, reply) => {
    try {
      const stats = rateLimitTracker.getStats()
      return { success: true, data: stats, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  app.get('/bitget-quota', async (_req, reply) => {
    try {
      const quota = rateLimitTracker.getBitgetQuotaStatus()
      return { success: true, data: quota, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })
}
