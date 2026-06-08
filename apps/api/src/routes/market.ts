import type { FastifyPluginAsync } from 'fastify'

export const marketRoutes: FastifyPluginAsync = async (app) => {
  app.get('/tickers', async () => {
    // TODO Session 2: BitgetService.getTickers()
    return { success: true, data: [], timestamp: Date.now() }
  })

  app.get('/ticker/:symbol', async (req) => {
    const { symbol } = req.params as { symbol: string }
    return { success: true, data: { symbol }, timestamp: Date.now() }
  })

  app.get('/candles/:symbol', async (req) => {
    const { symbol } = req.params as { symbol: string }
    return { success: true, data: [], timestamp: Date.now() }
  })
}
