import type { FastifyPluginAsync } from 'fastify'
import { orderBookService } from '../services/orderbook'

export const orderBookRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/orderbook/:symbol?depth=20
  app.get<{
    Params: { symbol: string }
    Querystring: { depth?: string }
  }>('/:symbol', async (req, reply) => {
    try {
      const depth = parseInt(req.query.depth ?? '20')
      if (depth > 100) {
        return reply.status(400).send({ success: false, error: 'Max depth is 100', timestamp: Date.now() })
      }
      const book = await orderBookService.fetch(req.params.symbol.toUpperCase(), depth)
      return { success: true, data: book, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // GET /api/orderbook/:symbol/summary — lightweight imbalance summary
  app.get<{ Params: { symbol: string } }>(
    '/:symbol/summary', async (req, reply) => {
      try {
        const book = await orderBookService.fetch(req.params.symbol.toUpperCase(), 10)
        return {
          success: true,
          data: {
            symbol: book.symbol,
            mid_price: book.mid_price,
            spread: book.spread,
            spread_pct: book.spread_pct,
            imbalance: book.imbalance,
            bid_depth: book.bid_depth,
            ask_depth: book.ask_depth,
            timestamp: book.timestamp,
          },
          timestamp: Date.now(),
        }
      } catch (err: any) {
        return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )
}
