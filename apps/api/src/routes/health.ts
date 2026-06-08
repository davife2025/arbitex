import type { FastifyPluginAsync } from 'fastify'

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({
    success: true,
    service: 'arbitex-api',
    version: '0.0.1',
    timestamp: Date.now(),
  }))
}
