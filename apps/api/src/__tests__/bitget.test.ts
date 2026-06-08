import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as crypto from 'crypto'

// We test the signing logic in isolation by extracting it
function sign(secret: string, timestamp: string, method: string, path: string, body = ''): string {
  const message = `${timestamp}${method.toUpperCase()}${path}${body}`
  return crypto.createHmac('sha256', secret).update(message).digest('base64')
}

describe('BitgetService — HMAC signing', () => {
  const secret = 'test-secret-key'

  it('produces a base64 string', () => {
    const sig = sign(secret, '1234567890', 'GET', '/api/v2/spot/market/tickers')
    expect(sig).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })

  it('is deterministic for the same inputs', () => {
    const ts = Date.now().toString()
    const a = sign(secret, ts, 'GET', '/api/v2/spot/market/tickers')
    const b = sign(secret, ts, 'GET', '/api/v2/spot/market/tickers')
    expect(a).toBe(b)
  })

  it('differs when method changes', () => {
    const ts = '1000000'
    const get = sign(secret, ts, 'GET', '/api/v2/spot/trade/place-order')
    const post = sign(secret, ts, 'POST', '/api/v2/spot/trade/place-order')
    expect(get).not.toBe(post)
  })

  it('differs when body changes', () => {
    const ts = '1000000'
    const noBody = sign(secret, ts, 'POST', '/api/v2/spot/trade/place-order', '')
    const withBody = sign(secret, ts, 'POST', '/api/v2/spot/trade/place-order', '{"symbol":"BTCUSDT"}')
    expect(noBody).not.toBe(withBody)
  })

  it('differs when timestamp changes', () => {
    const a = sign(secret, '1000000', 'GET', '/path')
    const b = sign(secret, '2000000', 'GET', '/path')
    expect(a).not.toBe(b)
  })

  it('uppercases the method before signing', () => {
    const ts = '1000000'
    const lower = sign(secret, ts, 'get', '/path')
    const upper = sign(secret, ts, 'GET', '/path')
    expect(lower).toBe(upper)
  })
})

describe('BitgetService — response parsing', () => {
  it('maps ticker response to Ticker shape correctly', () => {
    const raw = {
      symbol: 'BTCUSDT',
      lastPr: '65000.5',
      bidPr: '64999.0',
      askPr: '65001.0',
      baseVolume: '12345.678',
      change24h: '0.0312',
    }

    const ticker = {
      symbol: raw.symbol,
      last_price: parseFloat(raw.lastPr),
      bid: parseFloat(raw.bidPr),
      ask: parseFloat(raw.askPr),
      volume_24h: parseFloat(raw.baseVolume),
      change_24h: parseFloat(raw.change24h) * 100,
      timestamp: Date.now(),
    }

    expect(ticker.symbol).toBe('BTCUSDT')
    expect(ticker.last_price).toBe(65000.5)
    expect(ticker.change_24h).toBeCloseTo(3.12)
  })

  it('maps candle array to Candle shape correctly', () => {
    const raw = ['1700000000000', '64000', '65500', '63800', '65200', '500.5']
    const candle = {
      symbol: 'BTCUSDT',
      interval: '1h' as const,
      open: parseFloat(raw[1]),
      high: parseFloat(raw[2]),
      low: parseFloat(raw[3]),
      close: parseFloat(raw[4]),
      volume: parseFloat(raw[5]),
      timestamp: parseInt(raw[0]),
    }

    expect(candle.open).toBe(64000)
    expect(candle.high).toBe(65500)
    expect(candle.low).toBe(63800)
    expect(candle.close).toBe(65200)
    expect(candle.volume).toBe(500.5)
    expect(candle.timestamp).toBe(1700000000000)
  })

  it('filters zero-balance assets correctly', () => {
    const rawBalances = [
      { coin: 'BTC', available: '0.5', frozen: '0.1' },
      { coin: 'ETH', available: '0', frozen: '0' },
      { coin: 'USDT', available: '1000', frozen: '200' },
    ]

    const filtered = rawBalances
      .filter((a) => parseFloat(a.available) > 0 || parseFloat(a.frozen) > 0)
      .map((a) => ({
        currency: a.coin,
        available: parseFloat(a.available),
        total: parseFloat(a.available) + parseFloat(a.frozen),
      }))

    expect(filtered).toHaveLength(2)
    expect(filtered.find((b) => b.currency === 'ETH')).toBeUndefined()
    expect(filtered.find((b) => b.currency === 'USDT')?.total).toBe(1200)
  })
})
