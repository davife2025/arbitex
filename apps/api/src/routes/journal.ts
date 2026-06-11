import type { FastifyPluginAsync } from 'fastify'
import { journalService } from '../services/journal'

export const journalRoutes: FastifyPluginAsync = async (app) => {

  app.get<{ Params: { userId: string }; Querystring: Record<string,string> }>(
    '/:userId', async (req, reply) => {
      try {
        const { mood, tag, from, to, limit, offset } = req.query
        const entries = await journalService.list(req.params.userId, {
          mood, tag, from, to,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        })
        return { success: true, data: entries, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  app.get<{ Params: { userId: string; id: string } }>(
    '/:userId/:id', async (req, reply) => {
      const entry = await journalService.get(req.params.userId, req.params.id)
      if (!entry) return reply.status(404).send({ success: false, error: 'Not found', timestamp: Date.now() })
      return { success: true, data: entry, timestamp: Date.now() }
    }
  )

  app.post<{ Body: { user_id: string; [k: string]: any } }>(
    '/', async (req, reply) => {
      const { user_id, ...params } = req.body
      if (!user_id || !params.title) {
        return reply.status(400).send({ success: false, error: 'user_id and title required', timestamp: Date.now() })
      }
      try {
        const entry = await journalService.create(user_id, params)
        return { success: true, data: entry, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  app.patch<{ Params: { userId: string; id: string }; Body: Record<string,any> }>(
    '/:userId/:id', async (req, reply) => {
      try {
        const entry = await journalService.update(req.params.userId, req.params.id, req.body)
        return { success: true, data: entry, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  app.delete<{ Params: { userId: string; id: string } }>(
    '/:userId/:id', async (req, reply) => {
      try {
        await journalService.delete(req.params.userId, req.params.id)
        return { success: true, data: null, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  app.get<{ Params: { userId: string } }>('/:userId/meta/stats', async (req, reply) => {
    try {
      const stats = await journalService.getStats(req.params.userId)
      return { success: true, data: stats, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  app.get<{ Params: { userId: string } }>('/:userId/meta/tags', async (req, reply) => {
    try {
      const tags = await journalService.getAllTags(req.params.userId)
      return { success: true, data: tags, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })
}
