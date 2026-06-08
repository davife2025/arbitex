// TODO Session 2: Full WebSocket broadcasting for live market + portfolio events
import type { FastifyPluginAsync } from 'fastify'

export const wsPlugin: FastifyPluginAsync = async (app) => {
  app.get('/ws', { websocket: true }, (socket) => {
    socket.on('message', (msg) => {
      // Echo back for now — Session 2 wires up real events
      socket.send(JSON.stringify({ type: 'ack', payload: msg.toString(), timestamp: Date.now() }))
    })

    socket.on('close', () => {
      app.log.info('WebSocket client disconnected')
    })
  })
}
