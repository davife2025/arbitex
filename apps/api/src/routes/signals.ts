import type { FastifyPluginAsync } from 'fastify'

export const signalRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => {
    return { success: true, data: [], timestamp: Date.now() }
  })

  app.post('/generate', async () => {
    // TODO Session 3: Kimi K2 signal generation
    return { success: true, data: null, timestamp: Date.now() }
  })
}
