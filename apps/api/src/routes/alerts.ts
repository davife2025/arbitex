import type { FastifyPluginAsync } from 'fastify'
import { supabaseAdmin } from '../services/supabase'
import { telegramAlertService } from '../services/telegram-alert'
import { emailAlertService } from '../services/email-alert'
import { alertDispatcher } from '../services/alert-dispatcher'

interface AlertPrefsBody {
  user_id: string
  email_enabled?: boolean
  email_address?: string
  telegram_enabled?: boolean
  telegram_chat_id?: string
  notify_signal_generated?: boolean
  notify_signal_triggered?: boolean
  notify_signal_expired?: boolean
  notify_stop_hit?: boolean
  notify_target_hit?: boolean
  min_confidence?: 'low' | 'medium' | 'high'
}

export const alertRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/alerts/preferences/:userId
  app.get<{ Params: { userId: string } }>(
    '/preferences/:userId',
    async (req, reply) => {
      const { data, error } = await supabaseAdmin
        .from('alert_preferences')
        .select('*')
        .eq('user_id', req.params.userId)
        .single()

      if (error || !data) {
        return reply.status(404).send({
          success: false,
          error: 'Alert preferences not found',
          timestamp: Date.now(),
        })
      }

      return { success: true, data, timestamp: Date.now() }
    }
  )

  // POST /api/alerts/preferences — create or update
  app.post<{ Body: AlertPrefsBody }>(
    '/preferences',
    async (req, reply) => {
      const { user_id, ...prefs } = req.body

      if (!user_id) {
        return reply.status(400).send({
          success: false,
          error: 'user_id is required',
          timestamp: Date.now(),
        })
      }

      const { data, error } = await supabaseAdmin
        .from('alert_preferences')
        .upsert({ user_id, ...prefs }, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) {
        return reply.status(500).send({
          success: false,
          error: error.message,
          timestamp: Date.now(),
        })
      }

      return { success: true, data, timestamp: Date.now() }
    }
  )

  // POST /api/alerts/test/telegram — send a test Telegram message
  app.post<{ Body: { chat_id: string } }>(
    '/test/telegram',
    async (req, reply) => {
      const { chat_id } = req.body

      if (!chat_id) {
        return reply.status(400).send({
          success: false,
          error: 'chat_id is required',
          timestamp: Date.now(),
        })
      }

      const result = await telegramAlertService.testConnection(chat_id)

      return {
        success: result.success,
        data: result,
        timestamp: Date.now(),
      }
    }
  )

  // POST /api/alerts/test/email — send a test email
  app.post<{ Body: { email: string } }>(
    '/test/email',
    async (req, reply) => {
      const { email } = req.body

      if (!email) {
        return reply.status(400).send({
          success: false,
          error: 'email is required',
          timestamp: Date.now(),
        })
      }

      // Build a mock signal for the test email
      const mockSignal: any = {
        id: 'test-signal',
        user_id: 'test',
        symbol: 'BTCUSDT',
        direction: 'long',
        confidence: 'high',
        entry_price: 65000,
        target_price: 67000,
        stop_loss: 64000,
        reasoning: 'This is a test alert from Arbitex. Your email notifications are working correctly.',
        model_used: 'moonshotai/Kimi-K2-Instruct',
        status: 'active',
        created_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
      }

      const result = await emailAlertService.sendSignalAlert(
        email, mockSignal, 'signal_generated'
      )

      return {
        success: result.success,
        data: result,
        timestamp: Date.now(),
      }
    }
  )

  // GET /api/alerts/log/:userId — alert history
  app.get<{
    Params: { userId: string }
    Querystring: { limit?: string; channel?: string }
  }>('/log/:userId', async (req, reply) => {
    let query = supabaseAdmin
      .from('alert_log')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('sent_at', { ascending: false })
      .limit(parseInt(req.query.limit ?? '50'))

    if (req.query.channel) {
      query = query.eq('channel', req.query.channel)
    }

    const { data, error } = await query

    if (error) {
      return reply.status(500).send({
        success: false,
        error: error.message,
        timestamp: Date.now(),
      })
    }

    return { success: true, data, timestamp: Date.now() }
  })

  // GET /api/alerts/log/:userId/stats — success/fail counts
  app.get<{ Params: { userId: string } }>(
    '/log/:userId/stats',
    async (req, reply) => {
      const { data, error } = await supabaseAdmin
        .from('alert_log')
        .select('channel, success')
        .eq('user_id', req.params.userId)

      if (error) {
        return reply.status(500).send({
          success: false, error: error.message, timestamp: Date.now(),
        })
      }

      const stats = (data ?? []).reduce(
        (acc: any, row: any) => {
          const key = `${row.channel}_${row.success ? 'success' : 'fail'}`
          acc[key] = (acc[key] ?? 0) + 1
          return acc
        },
        {}
      )

      return { success: true, data: stats, timestamp: Date.now() }
    }
  )
}
