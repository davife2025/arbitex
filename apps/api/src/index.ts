import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import { config } from '@arbitex/config'

// Routes
import { healthRoutes } from './routes/health'
import { marketRoutes } from './routes/market'
import { portfolioRoutes } from './routes/portfolio'
import { signalRoutes } from './routes/signals'
import { orderRoutes } from './routes/orders'

// Plugins
import { wsPlugin } from './plugins/ws'

// Services
import { startMarketPoller } from './services/market-poller'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

async function bootstrap() {
  // Core plugins
  await app.register(helmet)
  await app.register(cors, { origin: config.api.corsOrigin, credentials: true })
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })
  await app.register(websocket)

  // WebSocket handler
  await app.register(wsPlugin)

  // REST Routes
  await app.register(healthRoutes, { prefix: '/health' })
  await app.register(marketRoutes, { prefix: '/api/market' })
  await app.register(portfolioRoutes, { prefix: '/api/portfolio' })
  await app.register(signalRoutes, { prefix: '/api/signals' })
  await app.register(orderRoutes, { prefix: '/api/orders' })

  // Global error handler
  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error)
    reply.status(error.statusCode ?? 500).send({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    })
  })

  await app.listen({ port: config.api.port, host: '0.0.0.0' })
  console.log(`\n🚀 Arbitex API running on port ${config.api.port}`)
  console.log(`📡 WebSocket available at ws://localhost:${config.api.port}/ws\n`)

  // Start background market polling
  startMarketPoller()
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
