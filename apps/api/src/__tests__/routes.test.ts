import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import { healthRoutes } from '../routes/health'
import { marketRoutes } from '../routes/market'

// Mock supabase and bitget before route registration
vi.mock('../services/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  },
}))

vi.mock('../services/bitget', () => ({
  bitgetService: {
    getTicker: vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT',
      last_price: 65000,
      bid: 64999,
      ask: 65001,
      volume_24h: 12345,
      change_24h: 2.5,
      timestamp: Date.now(),
    }),
    getCandles: vi.fn().mockResolvedValue([]),
    getTickers: vi.fn().mockResolvedValue([]),
  },
}))

describe('Health route', () => {
  const app = Fastify()

  beforeAll(async () => {
    await app.register(healthRoutes, { prefix: '/health' })
    await app.ready()
  })

  afterAll(() => app.close())

  it('GET /health returns 200 with service info', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.service).toBe('arbitex-api')
    expect(typeof body.timestamp).toBe('number')
  })
})

describe('Market routes', () => {
  const app = Fastify()

  beforeAll(async () => {
    await app.register(marketRoutes, { prefix: '/api/market' })
    await app.ready()
  })

  afterAll(() => app.close())

  it('GET /api/market/tickers returns 200 with data array', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/market/tickers' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('GET /api/market/ticker/:symbol returns ticker', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/market/ticker/BTCUSDT' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.symbol).toBe('BTCUSDT')
    expect(body.data.last_price).toBe(65000)
  })

  it('GET /api/market/candles/:symbol returns array', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/market/candles/BTCUSDT' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('GET /api/market/symbols returns array', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/market/symbols' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})
