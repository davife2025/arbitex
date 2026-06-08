import type { FastifyPluginAsync } from 'fastify'
import { broadcaster } from '../services/ws-broadcaster'

export const wsPlugin: FastifyPluginAsync = async (app) => {
  app.get('/ws', { websocket: true }, (socket) => {
    broadcaster.register(socket)
    app.log.info(`WS client connected — total: ${broadcaster.connectionCount}`)

    // Send initial handshake
    socket.send(JSON.stringify({
      type: 'connected',
      payload: { message: 'Arbitex WS ready' },
      timestamp: Date.now(),
    }))

    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())

        // Client can subscribe to specific symbols
        if (msg.type === 'subscribe') {
          socket.send(JSON.stringify({
            type: 'subscribed',
            payload: { symbols: msg.symbols },
            timestamp: Date.now(),
          }))
        }
      } catch {
        // ignore malformed messages
      }
    })

    socket.on('close', () => {
      broadcaster.unregister(socket)
      app.log.info(`WS client disconnected — total: ${broadcaster.connectionCount}`)
    })

    socket.on('error', (err) => {
      app.log.error(`WS error: ${err.message}`)
      broadcaster.unregister(socket)
    })
  })
}
