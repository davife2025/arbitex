import type { FastifyPluginAsync } from 'fastify'
import { kimiService } from '../services/kimi'
import { bitgetService } from '../services/bitget'
import { supabaseAdmin } from '../services/supabase'
import { broadcaster } from '../services/ws-broadcaster'

interface GenerateSignalBody {
  symbol: string
  interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  candle_limit?: number
  user_id?: string   // Session 4: injected by auth middleware
}

export const signalRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/signals — fetch active signals from Supabase
  app.get<{ Querystring: { symbol?: string; status?: string; limit?: string } }>(
    '/',
    async (req, reply) => {
      try {
        let query = supabaseAdmin
          .from('ai_signals')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(parseInt(req.query.limit ?? '20'))

        if (req.query.symbol) query = query.eq('symbol', req.query.symbol)
        if (req.query.status) query = query.eq('status', req.query.status)
        else query = query.eq('status', 'active')

        const { data, error } = await query
        if (error) throw new Error(error.message)

        return { success: true, data, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  // GET /api/signals/:id — single signal
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const { data, error } = await supabaseAdmin
      .from('ai_signals')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !data) {
      return reply.status(404).send({ success: false, error: 'Signal not found', timestamp: Date.now() })
    }

    return { success: true, data, timestamp: Date.now() }
  })

  // POST /api/signals/generate — trigger Kimi K2 analysis
  app.post<{ Body: GenerateSignalBody }>('/generate', async (req, reply) => {
    const { symbol, interval = '1h', candle_limit = 100, user_id } = req.body

    if (!symbol) {
      return reply.status(400).send({
        success: false,
        error: 'symbol is required',
        timestamp: Date.now(),
      })
    }

    try {
      // 1. Fetch live market data
      const [ticker, candles] = await Promise.all([
        bitgetService.getTicker(symbol.toUpperCase()),
        bitgetService.getCandles(symbol.toUpperCase(), interval, candle_limit),
      ])

      if (candles.length < 20) {
        return reply.status(422).send({
          success: false,
          error: 'Insufficient candle data for analysis',
          timestamp: Date.now(),
        })
      }

      // 2. Generate signal via Kimi K2
      const signal = await kimiService.generateSignal({ symbol, ticker, candles })

      // 3. Persist to Supabase
      const { data: saved, error: dbError } = await supabaseAdmin
        .from('ai_signals')
        .insert({
          ...signal,
          user_id: user_id ?? null,  // null until auth wired in Session 4
        })
        .select()
        .single()

      if (dbError) throw new Error(dbError.message)

      // 4. Broadcast to all WS clients
      broadcaster.broadcast('signal_update', saved)

      return { success: true, data: saved, timestamp: Date.now() }
    } catch (err: any) {
      app.log.error(`Signal generation failed: ${err.message}`)
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // POST /api/signals/generate-batch — multi-symbol scan
  app.post<{ Body: { symbols: string[]; interval?: string } }>(
    '/generate-batch',
    async (req, reply) => {
      const { symbols, interval = '1h' } = req.body

      if (!symbols?.length) {
        return reply.status(400).send({
          success: false,
          error: 'symbols array is required',
          timestamp: Date.now(),
        })
      }

      if (symbols.length > 5) {
        return reply.status(400).send({
          success: false,
          error: 'Max 5 symbols per batch',
          timestamp: Date.now(),
        })
      }

      // Run sequentially to respect rate limits
      const results: any[] = []
      const errors: any[] = []

      for (const symbol of symbols) {
        try {
          const [ticker, candles] = await Promise.all([
            bitgetService.getTicker(symbol.toUpperCase()),
            bitgetService.getCandles(symbol.toUpperCase(), interval as any, 100),
          ])

          const signal = await kimiService.generateSignal({ symbol, ticker, candles })

          const { data: saved } = await supabaseAdmin
            .from('ai_signals')
            .insert({ ...signal, user_id: null })
            .select()
            .single()

          if (saved) {
            broadcaster.broadcast('signal_update', saved)
            results.push(saved)
          }
        } catch (err: any) {
          errors.push({ symbol, error: err.message })
        }

        // Rate limit buffer between Kimi calls
        await new Promise((r) => setTimeout(r, 500))
      }

      return {
        success: true,
        data: { signals: results, errors },
        timestamp: Date.now(),
      }
    }
  )

  // GET /api/signals/market-overview — Kimi market summary
  app.get('/market-overview', async (_req, reply) => {
    try {
      const TOP_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']

      const tickerResults = await Promise.allSettled(
        TOP_SYMBOLS.map((s) => bitgetService.getTicker(s))
      )

      const tickers = tickerResults
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value)

      const overview = await kimiService.analyzeMarket(TOP_SYMBOLS, tickers)

      return { success: true, data: { overview, tickers }, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // PATCH /api/signals/:id/status — mark triggered/cancelled/expired
  app.patch<{
    Params: { id: string }
    Body: { status: 'triggered' | 'cancelled' | 'expired' }
  }>('/:id/status', async (req, reply) => {
    const { id } = req.params
    const { status } = req.body

    const allowed = ['triggered', 'cancelled', 'expired']
    if (!allowed.includes(status)) {
      return reply.status(400).send({
        success: false,
        error: `status must be one of: ${allowed.join(', ')}`,
        timestamp: Date.now(),
      })
    }

    const { data, error } = await supabaseAdmin
      .from('ai_signals')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return reply.status(404).send({ success: false, error: 'Signal not found', timestamp: Date.now() })
    }

    broadcaster.broadcast('signal_update', data)

    return { success: true, data, timestamp: Date.now() }
  })
}
