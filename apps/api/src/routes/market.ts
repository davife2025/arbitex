import type { FastifyPluginAsync } from 'fastify'
import { bitgetService } from '../services/bitget'
import { supabaseAdmin } from '../services/supabase'
import type { CandleInterval } from '@arbitex/types'

export const marketRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/market/tickers — all cached tickers from Supabase
  app.get('/tickers', async (_req, reply) => {
    const { data, error } = await supabaseAdmin
      .from('tickers')
      .select('*')
      .order('fetched_at', { ascending: false })
      .limit(50)

    if (error) {
      return reply.status(500).send({ success: false, error: error.message, timestamp: Date.now() })
    }

    return { success: true, data, timestamp: Date.now() }
  })

  // GET /api/market/ticker/:symbol — live from Bitget
  app.get<{ Params: { symbol: string } }>('/ticker/:symbol', async (req, reply) => {
    try {
      const { symbol } = req.params
      const ticker = await bitgetService.getTicker(symbol.toUpperCase())
      return { success: true, data: ticker, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // GET /api/market/candles/:symbol?interval=1h&limit=100
  app.get<{
    Params: { symbol: string }
    Querystring: { interval?: CandleInterval; limit?: string }
  }>('/candles/:symbol', async (req, reply) => {
    try {
      const { symbol } = req.params
      const interval = (req.query.interval ?? '1h') as CandleInterval
      const limit = parseInt(req.query.limit ?? '100')

      const candles = await bitgetService.getCandles(symbol.toUpperCase(), interval, limit)

      // Cache to Supabase
      if (candles.length > 0) {
        await supabaseAdmin.from('candles').upsert(
          candles.map((c) => ({
            symbol: c.symbol,
            interval: c.interval,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
            candle_time: new Date(c.timestamp).toISOString(),
          })),
          { onConflict: 'symbol,interval,candle_time' }
        )
      }

      return { success: true, data: candles, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // GET /api/market/symbols — supported trading pairs
  app.get('/symbols', async (_req, reply) => {
    try {
      const tickers = await bitgetService.getTickers()
      const symbols = tickers.map((t) => t.symbol).sort()
      return { success: true, data: symbols, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })
}
