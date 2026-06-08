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
import { registerErrorHandler } from './plugins/error-handler'

// Background services
import { startMarketPoller } from './services/market-poller'
import { startSignalExpiryWorker } from './services/signal-expiry'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
  trustProxy: true,   // for Railway/Render deployment
})

async function bootstrap() {
  // Security
  await app.register(helmet, {
    contentSecurityPolicy: false, // handled by Next.js
  })
  await app.register(cors, {
    origin: config.api.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // Global rate limit (per-route overrides in rateLimiterPlugin)
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
    errorResponseBuilder: (_req, context) => ({
      success: false,
      error: `Rate limit exceeded. Retry in ${Math.ceil(context.ttl / 1000)}s.`,
      timestamp: Date.now(),
    }),
  })

  // WebSocket
  await app.register(websocket)
  await app.register(wsPlugin)

  // REST routes
  await app.register(healthRoutes,    { prefix: '/health' })
  await app.register(marketRoutes,    { prefix: '/api/market' })
  await app.register(portfolioRoutes, { prefix: '/api/portfolio' })
  await app.register(signalRoutes,    { prefix: '/api/signals' })
  await app.register(orderRoutes,     { prefix: '/api/orders' })

  // Structured error handling
  registerErrorHandler(app)

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`${signal} received — shutting down gracefully`)
    await app.close()
    process.exit(0)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  await app.listen({ port: config.api.port, host: '0.0.0.0' })

  console.log(`\n🚀 Arbitex API  →  http://localhost:${config.api.port}`)
  console.log(`📡 WebSocket    →  ws://localhost:${config.api.port}/ws`)
  console.log(`🤖 AI Model     →  ${config.huggingface.modelId}`)
  console.log(`🌍 Environment  →  ${process.env.NODE_ENV ?? 'development'}\n`)

  startMarketPoller()
  startSignalExpiryWorker()
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err)
  process.exit(1)
})
