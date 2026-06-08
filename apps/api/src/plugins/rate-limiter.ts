import type { FastifyPluginAsync } from 'fastify'
import rateLimit from '@fastify/rate-limit'

export const rateLimiterPlugin: FastifyPluginAsync = async (app) => {
  // Stricter limits for AI signal generation (expensive Kimi K2 calls)
  app.register(rateLimit, {
    global: false,
    max: 5,
    timeWindow: '1 minute',
    keyGenerator: (req) => (req as any).user?.id ?? req.ip,
    errorResponseBuilder: (_req, context) => ({
      success: false,
      error: `Signal generation rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)}s.`,
      timestamp: Date.now(),
    }),
    routeMatch: (routeOptions) =>
      routeOptions.url?.includes('/signals/generate') ?? false,
  })

  // Bitget order placement limits
  app.register(rateLimit, {
    global: false,
    max: 10,
    timeWindow: '1 minute',
    keyGenerator: (req) => (req as any).user?.id ?? req.ip,
    errorResponseBuilder: (_req, context) => ({
      success: false,
      error: `Order rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)}s.`,
      timestamp: Date.now(),
    }),
    routeMatch: (routeOptions) =>
      routeOptions.url === '/api/orders' && (routeOptions as any).method === 'POST',
  })
}
