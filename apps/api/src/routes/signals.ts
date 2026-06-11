import type { FastifyPluginAsync } from 'fastify'
import { kimiService } from '../services/kimi'
import { bitgetService } from '../services/bitget'
import { supabaseAdmin } from '../services/supabase'
import { broadcaster } from '../services/ws-broadcaster'
import { alertDispatcher } from '../services/alert-dispatcher'

interface GenerateSignalBody {
  symbol: string
  interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  candle_limit?: number
  user_id?: string
}

export const signalRoutes: FastifyPluginAsync = async (app) => {

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

  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const { data, error } = await supabaseAdmin
      .from('ai_signals').select('*').eq('id', req.params.id).single()
    if (error || !data) {
      return reply.status(404).send({ success: false, error: 'Signal not found', timestamp: Date.now() })
    }
    return { success: true, data, timestamp: Date.now() }
  })

  app.post<{ Body: GenerateSignalBody }>('/generate', async (req, reply) => {
    const { symbol, interval = '1h', candle_limit = 100, user_id } = req.body

    if (!symbol) {
      return reply.status(400).send({ success: false, error: 'symbol is required', timestamp: Date.now() })
    }

    try {
      const [ticker, candles] = await Promise.all([
        bitgetService.getTicker(symbol.toUpperCase()),
        bitgetService.getCandles(symbol.toUpperCase(), interval, candle_limit),
      ])

      if (candles.length < 20) {
        return reply.status(422).send({
          success: false, error: 'Insufficient candle data', timestamp: Date.now(),
        })
      }

      const signal = await kimiService.generateSignal({ symbol, ticker, candles })

      const { data: saved, error: dbError } = await supabaseAdmin
        .from('ai_signals')
        .insert({ ...signal, user_id: user_id ?? null })
        .select().single()

      if (dbError) throw new Error(dbError.message)

      broadcaster.broadcast('signal_update', saved)

      // Fire-and-forget alert dispatch
      if (saved) {
        alertDispatcher.dispatchSignalAlert(saved, 'signal_generated').catch((err) =>
          app.log.error(`Alert dispatch error: ${err.message}`)
        )
      }

      return { success: true, data: saved, timestamp: Date.now() }
    } catch (err: any) {
      app.log.error(`Signal generation failed: ${err.message}`)
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  app.post<{ Body: { symbols: string[]; interval?: string } }>(
    '/generate-batch',
    async (req, reply) => {
      const { symbols, interval = '1h' } = req.body

      if (!symbols?.length) {
        return reply.status(400).send({ success: false, error: 'symbols array is required', timestamp: Date.now() })
      }
      if (symbols.length > 5) {
        return reply.status(400).send({ success: false, error: 'Max 5 symbols per batch', timestamp: Date.now() })
      }

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
            .from('ai_signals').insert({ ...signal, user_id: null }).select().single()

          if (saved) {
            broadcaster.broadcast('signal_update', saved)
            alertDispatcher.dispatchSignalAlert(saved, 'signal_generated').catch(() => {})
            results.push(saved)
          }
        } catch (err: any) {
          errors.push({ symbol, error: err.message })
        }
        await new Promise((r) => setTimeout(r, 500))
      }

      return { success: true, data: { signals: results, errors }, timestamp: Date.now() }
    }
  )

  app.get('/market-overview', async (_req, reply) => {
    try {
      const TOP_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']
      const tickerResults = await Promise.allSettled(TOP_SYMBOLS.map((s) => bitgetService.getTicker(s)))
      const tickers = tickerResults
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value)
      const overview = await kimiService.analyzeMarket(TOP_SYMBOLS, tickers)
      return { success: true, data: { overview, tickers }, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  app.patch<{
    Params: { id: string }
    Body: { status: 'triggered' | 'cancelled' | 'expired' }
  }>('/:id/status', async (req, reply) => {
    const { id } = req.params
    const { status } = req.body
    const allowed = ['triggered', 'cancelled', 'expired']
    if (!allowed.includes(status)) {
      return reply.status(400).send({
        success: false, error: `status must be one of: ${allowed.join(', ')}`, timestamp: Date.now(),
      })
    }

    const { data, error } = await supabaseAdmin
      .from('ai_signals').update({ status }).eq('id', id).select().single()

    if (error || !data) {
      return reply.status(404).send({ success: false, error: 'Signal not found', timestamp: Date.now() })
    }

    broadcaster.broadcast('signal_update', data)

    // Alert on triggered / expired
    if (status === 'triggered' || status === 'expired') {
      const alertEvent = status === 'triggered' ? 'signal_triggered' : 'signal_expired'
      alertDispatcher.dispatchSignalAlert(data, alertEvent).catch(() => {})
    }

    return { success: true, data, timestamp: Date.now() }
  })
}
