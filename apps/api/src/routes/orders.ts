import type { FastifyPluginAsync } from 'fastify'

export const orderRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => {
    return { success: true, data: [], timestamp: Date.now() }
  })

  app.post('/', async () => {
    // TODO Session 2: Bitget order placement
    return { success: true, data: null, timestamp: Date.now() }
  })

  app.delete('/:orderId', async (req) => {
    const { orderId } = req.params as { orderId: string }
    return { success: true, data: { orderId }, timestamp: Date.now() }
  })
}
