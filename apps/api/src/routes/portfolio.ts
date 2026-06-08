import type { FastifyPluginAsync } from 'fastify'

export const portfolioRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => {
    return { success: true, data: null, timestamp: Date.now() }
  })

  app.get('/positions', async () => {
    return { success: true, data: [], timestamp: Date.now() }
  })
}
