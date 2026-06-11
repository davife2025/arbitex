import type { FastifyPluginAsync } from 'fastify'
import { marketCommentaryService } from '../services/market-commentary'

export const commentaryRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/commentary — get latest (from cache or generate)
  app.get('/', async (_req, reply) => {
    try {
      const commentary = await marketCommentaryService.generate()
      return { success: true, data: commentary, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // POST /api/commentary/refresh — force regenerate
  app.post('/refresh', async (_req, reply) => {
    try {
      const commentary = await marketCommentaryService.generate(true)
      return { success: true, data: commentary, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })
}
