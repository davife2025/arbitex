import type { FastifyPluginAsync } from 'fastify'
import { performanceTracker } from '../services/performance-tracker'
import { supabaseAdmin } from '../services/supabase'

export const performanceRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/performance/summary — full summary
  app.get<{ Querystring: { user_id?: string; days?: string } }>(
    '/summary',
    async (req, reply) => {
      try {
        const days = parseInt(req.query.days ?? '30')
        if (days > 365) {
          return reply.status(400).send({ success: false, error: 'Max 365 days', timestamp: Date.now() })
        }
        const summary = await performanceTracker.getSummary(req.query.user_id, days)
        return { success: true, data: summary, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  // GET /api/performance/outcomes — paginated outcome list
  app.get<{
    Querystring: {
      user_id?: string
      symbol?: string
      outcome?: string
      limit?: string
      offset?: string
    }
  }>('/outcomes', async (req, reply) => {
    try {
      let query = supabaseAdmin
        .from('signal_outcomes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parseInt(req.query.limit ?? '50'))
        .range(
          parseInt(req.query.offset ?? '0'),
          parseInt(req.query.offset ?? '0') + parseInt(req.query.limit ?? '50') - 1
        )

      if (req.query.user_id) query = query.eq('user_id', req.query.user_id)
      if (req.query.symbol)  query = query.eq('symbol', req.query.symbol)
      if (req.query.outcome) query = query.eq('outcome', req.query.outcome)

      const { data, error, count } = await query
      if (error) throw new Error(error.message)

      return { success: true, data, count, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // POST /api/performance/record — manually record an outcome
  app.post<{
    Body: {
      signal_id: string
      outcome: 'win' | 'loss' | 'expired'
      exit_price: number
      bars_held?: number
    }
  }>('/record', async (req, reply) => {
    const { signal_id, outcome, exit_price, bars_held } = req.body

    if (!signal_id || !outcome || !exit_price) {
      return reply.status(400).send({
        success: false,
        error: 'signal_id, outcome, and exit_price are required',
        timestamp: Date.now(),
      })
    }

    try {
      const { data: signal, error: sigErr } = await supabaseAdmin
        .from('ai_signals').select('*').eq('id', signal_id).single()

      if (sigErr || !signal) {
        return reply.status(404).send({ success: false, error: 'Signal not found', timestamp: Date.now() })
      }

      await performanceTracker.recordOutcome(signal as any, outcome, exit_price, bars_held)

      // Update signal status
      await supabaseAdmin
        .from('ai_signals')
        .update({ status: outcome === 'win' ? 'triggered' : outcome === 'loss' ? 'triggered' : 'expired' })
        .eq('id', signal_id)

      return { success: true, data: { signal_id, outcome }, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // GET /api/performance/snapshots — daily snapshot history
  app.get<{ Querystring: { user_id?: string; days?: string } }>(
    '/snapshots',
    async (req, reply) => {
      try {
        const since = new Date(
          Date.now() - parseInt(req.query.days ?? '30') * 24 * 3600 * 1000
        ).toISOString().split('T')[0]

        let query = supabaseAdmin
          .from('performance_snapshots')
          .select('*')
          .gte('snapshot_date', since)
          .order('snapshot_date', { ascending: true })

        if (req.query.user_id) query = query.eq('user_id', req.query.user_id)

        const { data, error } = await query
        if (error) throw new Error(error.message)

        return { success: true, data, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  // GET /api/performance/leaderboard — top performing symbols
  app.get<{ Querystring: { days?: string } }>(
    '/leaderboard',
    async (req, reply) => {
      try {
        const summary = await performanceTracker.getSummary(undefined, parseInt(req.query.days ?? '30'))
        const leaderboard = summary.by_symbol
          .filter(s => s.total >= 2) // at least 2 signals
          .slice(0, 10)

        return { success: true, data: leaderboard, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )
}
