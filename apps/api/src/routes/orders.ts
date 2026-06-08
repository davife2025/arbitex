import type { FastifyPluginAsync } from 'fastify'
import { bitgetService } from '../services/bitget'
import { supabaseAdmin } from '../services/supabase'
import { broadcaster } from '../services/ws-broadcaster'

interface PlaceOrderBody {
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  size: number
  price?: number
  signal_id?: string
}

export const orderRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/orders — open orders from Bitget
  app.get<{ Querystring: { symbol?: string } }>('/', async (req, reply) => {
    try {
      const orders = await bitgetService.getOrders(req.query.symbol)
      return { success: true, data: orders, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // POST /api/orders — place a new order
  app.post<{ Body: PlaceOrderBody }>('/', async (req, reply) => {
    const { symbol, side, type, size, price, signal_id } = req.body

    if (!symbol || !side || !type || !size) {
      return reply.status(400).send({
        success: false,
        error: 'Missing required fields: symbol, side, type, size',
        timestamp: Date.now(),
      })
    }

    try {
      const result = await bitgetService.placeOrder({ symbol, side, type, size, price })

      // Persist to Supabase
      const { data: order } = await supabaseAdmin
        .from('orders')
        .insert({
          bitget_order_id: result.orderId,
          symbol,
          side,
          type,
          size,
          price,
          status: 'open',
          filled_size: 0,
          signal_id: signal_id ?? null,
          // user_id injected by auth middleware in Session 4
        })
        .select()
        .single()

      broadcaster.broadcast('order_update', order)

      return { success: true, data: { orderId: result.orderId, ...order }, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  // DELETE /api/orders/:orderId
  app.delete<{ Params: { orderId: string }; Querystring: { symbol: string } }>(
    '/:orderId',
    async (req, reply) => {
      const { orderId } = req.params
      const { symbol } = req.query

      if (!symbol) {
        return reply.status(400).send({
          success: false,
          error: 'symbol query param required',
          timestamp: Date.now(),
        })
      }

      try {
        await bitgetService.cancelOrder(symbol, orderId)

        // Update Supabase record
        await supabaseAdmin
          .from('orders')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('bitget_order_id', orderId)

        broadcaster.broadcast('order_update', { orderId, status: 'cancelled' })

        return { success: true, data: { orderId, status: 'cancelled' }, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(502).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )
}
