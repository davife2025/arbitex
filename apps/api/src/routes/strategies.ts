import type { FastifyPluginAsync } from 'fastify'
import { strategyEngine } from '../services/strategy-engine'
import { supabaseAdmin } from '../services/supabase'

export const strategyRoutes: FastifyPluginAsync = async (app) => {

  app.get<{ Params: { userId: string } }>('/:userId', async (req, reply) => {
    try {
      const strategies = await strategyEngine.getAll(req.params.userId)
      return { success: true, data: strategies, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  app.post<{ Body: { user_id: string; [k: string]: any } }>('/', async (req, reply) => {
    const { user_id, ...params } = req.body
    if (!user_id || !params.name || !params.symbols?.length) {
      return reply.status(400).send({
        success: false, error: 'user_id, name, and symbols are required', timestamp: Date.now(),
      })
    }
    try {
      const strategy = await strategyEngine.create(user_id, params)
      return { success: true, data: strategy, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  app.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    '/:id', async (req, reply) => {
      try {
        const strategy = await strategyEngine.update(req.params.id, req.body)
        return { success: true, data: strategy, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    try {
      await strategyEngine.delete(req.params.id)
      return { success: true, data: null, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // POST /api/strategies/:id/run — manual trigger
  app.post<{ Params: { id: string } }>('/:id/run', async (req, reply) => {
    try {
      const { data: strategy } = await supabaseAdmin
        .from('strategies').select('*').eq('id', req.params.id).single()
      if (!strategy) return reply.status(404).send({ success: false, error: 'Strategy not found', timestamp: Date.now() })
      const result = await strategyEngine.evaluate(strategy as any)
      return { success: true, data: result, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // GET /api/strategies/:id/triggers — trigger history
  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    '/:id/triggers', async (req, reply) => {
      try {
        const { data } = await supabaseAdmin
          .from('strategy_triggers')
          .select('*, ai_signals(*)')
          .eq('strategy_id', req.params.id)
          .order('triggered_at', { ascending: false })
          .limit(parseInt(req.query.limit ?? '20'))
        return { success: true, data, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )
}
