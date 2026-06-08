import { test, expect } from '@playwright/test'

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000'

test.describe('API health', () => {
  test('GET /health returns 200', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.service).toBe('arbitex-api')
    expect(body.version).toBe('0.0.1')
  })

  test('GET /health includes timestamp', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`)
    const body = await res.json()
    expect(typeof body.timestamp).toBe('number')
    // timestamp should be recent (within last 5s)
    expect(Date.now() - body.timestamp).toBeLessThan(5000)
  })

  test('unknown routes return 404 with structured error', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/nonexistent`)
    expect(res.status()).toBe(404)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('not found')
  })

  test('rate limit headers are present', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`)
    // @fastify/rate-limit adds x-ratelimit-* headers
    expect(res.headers()['x-ratelimit-limit']).toBeDefined()
    expect(res.headers()['x-ratelimit-remaining']).toBeDefined()
  })

  test('GET /api/market/tickers returns structured response', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/market/tickers`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(typeof body.timestamp).toBe('number')
  })

  test('GET /api/signals returns structured response', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/signals`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('POST /api/orders rejects missing fields with 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/orders`, {
      data: { symbol: 'BTCUSDT' }, // missing side, type, size
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Missing required fields')
  })

  test('POST /api/signals/generate rejects missing symbol with 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/signals/generate`, {
      data: { interval: '1h' }, // no symbol
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('symbol')
  })

  test('POST /api/signals/generate-batch rejects >5 symbols with 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/signals/generate-batch`, {
      data: { symbols: ['BTC','ETH','SOL','BNB','XRP','ADA'] },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Max 5 symbols')
  })
})
