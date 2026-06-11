import type { FastifyPluginAsync } from 'fastify'
import { notificationService } from '../services/notifications'

export const notificationRoutes: FastifyPluginAsync = async (app) => {

  app.get<{ Params: { userId: string }; Querystring: { unread?: string; limit?: string; type?: string } }>(
    '/:userId', async (req, reply) => {
      try {
        const items = await notificationService.list(req.params.userId, {
          unreadOnly: req.query.unread === 'true',
          limit: req.query.limit ? parseInt(req.query.limit) : undefined,
          type: req.query.type as any,
        })
        return { success: true, data: items, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  app.get<{ Params: { userId: string } }>('/:userId/count', async (req, reply) => {
    try {
      const count = await notificationService.getUnreadCount(req.params.userId)
      return { success: true, data: { count }, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  app.post<{ Params: { userId: string }; Body: { ids: string[] } }>(
    '/:userId/read', async (req, reply) => {
      try {
        await notificationService.markRead(req.params.userId, req.body.ids)
        return { success: true, data: null, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  app.post<{ Params: { userId: string } }>(
    '/:userId/read-all', async (req, reply) => {
      try {
        await notificationService.markAllRead(req.params.userId)
        return { success: true, data: null, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  app.delete<{ Params: { userId: string; id: string } }>(
    '/:userId/:id', async (req, reply) => {
      try {
        await notificationService.delete(req.params.userId, req.params.id)
        return { success: true, data: null, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )
}
