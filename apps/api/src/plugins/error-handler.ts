import type { FastifyInstance } from 'fastify'

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, req, reply) => {
    const statusCode = error.statusCode ?? 500

    // Don't log 4xx as errors
    if (statusCode >= 500) {
      app.log.error({
        err: error,
        method: req.method,
        url: req.url,
        statusCode,
      })
    }

    // Bitget API errors
    if (error.message.includes('Bitget API error')) {
      return reply.status(502).send({
        success: false,
        error: error.message,
        source: 'bitget',
        timestamp: Date.now(),
      })
    }

    // HuggingFace / Kimi errors
    if (error.message.includes('HuggingFace')) {
      return reply.status(502).send({
        success: false,
        error: 'AI service temporarily unavailable. Please retry.',
        source: 'kimi',
        timestamp: Date.now(),
      })
    }

    // Validation errors
    if (statusCode === 400) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        timestamp: Date.now(),
      })
    }

    // Rate limit
    if (statusCode === 429) {
      return reply.status(429).send({
        success: false,
        error: error.message,
        timestamp: Date.now(),
      })
    }

    // Default
    return reply.status(statusCode).send({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      timestamp: Date.now(),
    })
  })

  // 404 handler
  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      success: false,
      error: `Route ${req.method} ${req.url} not found`,
      timestamp: Date.now(),
    })
  })
}
