import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import { config } from '@arbitex/config'

import { healthRoutes }         from './routes/health'
import { marketRoutes }         from './routes/market'
import { portfolioRoutes }      from './routes/portfolio'
import { signalRoutes }         from './routes/signals'
import { orderRoutes }          from './routes/orders'
import { advancedSignalRoutes } from './routes/advanced-signals'
import { alertRoutes }          from './routes/alerts'
import { performanceRoutes }    from './routes/performance'
import { paperTradingRoutes }   from './routes/paper-trading'
import { watchlistRoutes }      from './routes/watchlist'
import { strategyRoutes }       from './routes/strategies'
import { riskRoutes }           from './routes/risk'
import { orderBookRoutes }      from './routes/orderbook'
import { commentaryRoutes }     from './routes/commentary'
import { accountRoutes }        from './routes/accounts'
import { journalRoutes }        from './routes/journal'
import { notificationRoutes }   from './routes/notifications'
import { rateLimitRoutes }      from './routes/rate-limits'

import { wsPlugin }             from './plugins/ws'
import { registerErrorHandler } from './plugins/error-handler'

import { startMarketPoller }       from './services/market-poller'
import { startSignalExpiryWorker } from './services/signal-expiry'
import { startSnapshotWorker }     from './services/snapshot-worker'
import { startStrategyRunner }     from './services/strategy-runner'
import { startCommentaryWorker }   from './services/commentary-worker'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
  trustProxy: true,
})

async function bootstrap() {
  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, {
    origin: config.api.corsOrigin, credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
  await app.register(rateLimit, {
    max: 120, timeWindow: '1 minute',
    errorResponseBuilder: (_req, context) => ({
      success: false,
      error: `Rate limit exceeded. Retry in ${Math.ceil(context.ttl / 1000)}s.`,
      timestamp: Date.now(),
    }),
  })
  await app.register(websocket)
  await app.register(wsPlugin)

  await app.register(healthRoutes,         { prefix: '/health' })
  await app.register(marketRoutes,         { prefix: '/api/market' })
  await app.register(portfolioRoutes,      { prefix: '/api/portfolio' })
  await app.register(signalRoutes,         { prefix: '/api/signals' })
  await app.register(advancedSignalRoutes, { prefix: '/api/signals' })
  await app.register(orderRoutes,          { prefix: '/api/orders' })
  await app.register(alertRoutes,          { prefix: '/api/alerts' })
  await app.register(performanceRoutes,    { prefix: '/api/performance' })
  await app.register(paperTradingRoutes,   { prefix: '/api/paper' })
  await app.register(watchlistRoutes,      { prefix: '/api/watchlist' })
  await app.register(strategyRoutes,       { prefix: '/api/strategies' })
  await app.register(riskRoutes,           { prefix: '/api/risk' })
  await app.register(orderBookRoutes,      { prefix: '/api/orderbook' })
  await app.register(commentaryRoutes,     { prefix: '/api/commentary' })
  await app.register(accountRoutes,        { prefix: '/api/accounts' })
  await app.register(journalRoutes,        { prefix: '/api/journal' })
  await app.register(notificationRoutes,   { prefix: '/api/notifications' })
  await app.register(rateLimitRoutes,      { prefix: '/api/rate-limits' })

  registerErrorHandler(app)

  const shutdown = async (sig: string) => {
    app.log.info(`${sig} — shutting down`)
    await app.close(); process.exit(0)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))

  await app.listen({ port: config.api.port, host: '0.0.0.0' })

  console.log(`\n🚀 Arbitex API   →  http://localhost:${config.api.port}`)
  console.log(`📡 WebSocket     →  ws://localhost:${config.api.port}/ws`)
  console.log(`📓 Journal       →  Trade journal with mood + tags`)
  console.log(`🔔 Notifications →  In-app + WS push`)
  console.log(`📊 Rate Limits   →  Bitget quota tracking`)
  console.log(`🌍 Environment   →  ${process.env.NODE_ENV ?? 'development'}\n`)

  startMarketPoller()
  startSignalExpiryWorker()
  startSnapshotWorker()
  startStrategyRunner()
  startCommentaryWorker()
}

bootstrap().catch(err => { console.error(err); process.exit(1) })
