import * as crypto from 'crypto'
import { config } from '@arbitex/config'
import { retry } from '@arbitex/utils'
import type { Ticker, Candle, Order, Position, CandleInterval } from '@arbitex/types'

interface BitgetResponse<T> {
  code: string
  msg: string
  data: T
}

export class BitgetService {
  private readonly apiKey = process.env.BITGET_API_KEY!
  private readonly apiSecret = process.env.BITGET_API_SECRET!
  private readonly passphrase = process.env.BITGET_PASSPHRASE!
  private readonly baseUrl = config.bitget.baseUrl

  // ── HMAC-SHA256 signing ──────────────────────────────────────
  private sign(timestamp: string, method: string, path: string, body = ''): string {
    const message = `${timestamp}${method.toUpperCase()}${path}${body}`
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('base64')
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    auth = false
  ): Promise<T> {
    const ts = Date.now().toString()
    const bodyStr = body ? JSON.stringify(body) : ''

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ACCESS-KEY': this.apiKey,
      'ACCESS-TIMESTAMP': ts,
      'locale': 'en-US',
    }

    if (auth) {
      headers['ACCESS-SIGN'] = this.sign(ts, method, path, bodyStr)
      headers['ACCESS-PASSPHRASE'] = this.passphrase
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: bodyStr || undefined,
    })

    const json: BitgetResponse<T> = await res.json()

    if (json.code !== '00000') {
      throw new Error(`Bitget API error [${json.code}]: ${json.msg}`)
    }

    return json.data
  }

  // ── Market Data ──────────────────────────────────────────────

  async getTickers(): Promise<Ticker[]> {
    return retry(async () => {
      const data = await this.request<any[]>(
        'GET',
        '/api/v2/spot/market/tickers'
      )

      return data.map((t) => ({
        symbol: t.symbol,
        last_price: parseFloat(t.lastPr),
        bid: parseFloat(t.bidPr),
        ask: parseFloat(t.askPr),
        volume_24h: parseFloat(t.baseVolume),
        change_24h: parseFloat(t.change24h) * 100,
        timestamp: Date.now(),
      }))
    })
  }

  async getTicker(symbol: string): Promise<Ticker> {
    return retry(async () => {
      const data = await this.request<any>(
        'GET',
        `/api/v2/spot/market/tickers?symbol=${symbol}`
      )

      const t = Array.isArray(data) ? data[0] : data
      return {
        symbol: t.symbol,
        last_price: parseFloat(t.lastPr),
        bid: parseFloat(t.bidPr),
        ask: parseFloat(t.askPr),
        volume_24h: parseFloat(t.baseVolume),
        change_24h: parseFloat(t.change24h) * 100,
        timestamp: Date.now(),
      }
    })
  }

  async getCandles(
    symbol: string,
    interval: CandleInterval = '1h',
    limit = 100
  ): Promise<Candle[]> {
    const intervalMap: Record<CandleInterval, string> = {
      '1m': '1min',
      '5m': '5min',
      '15m': '15min',
      '1h': '1h',
      '4h': '4h',
      '1d': '1day',
    }

    return retry(async () => {
      const data = await this.request<any[]>(
        'GET',
        `/api/v2/spot/market/candles?symbol=${symbol}&granularity=${intervalMap[interval]}&limit=${limit}`
      )

      return data.map((c) => ({
        symbol,
        interval,
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5]),
        timestamp: parseInt(c[0]),
      }))
    })
  }

  // ── Account (authenticated) ───────────────────────────────────

  async getBalance(): Promise<{ available: number; total: number; currency: string }[]> {
    return retry(async () => {
      const data = await this.request<any[]>(
        'GET',
        '/api/v2/spot/account/assets',
        undefined,
        true
      )

      return data
        .filter((a) => parseFloat(a.available) > 0 || parseFloat(a.frozen) > 0)
        .map((a) => ({
          currency: a.coin,
          available: parseFloat(a.available),
          total: parseFloat(a.available) + parseFloat(a.frozen),
        }))
    })
  }

  async getPositions(): Promise<Position[]> {
    return retry(async () => {
      const data = await this.request<any[]>(
        'GET',
        '/api/v2/mix/position/all-position?productType=USDT-FUTURES',
        undefined,
        true
      )

      return data.map((p) => ({
        id: p.positionId,
        user_id: '',
        symbol: p.symbol,
        side: p.holdSide === 'long' ? 'long' : 'short',
        size: parseFloat(p.total),
        entry_price: parseFloat(p.openPriceAvg),
        mark_price: parseFloat(p.markPrice),
        unrealized_pnl: parseFloat(p.unrealizedPL),
        leverage: parseInt(p.leverage),
        created_at: new Date(parseInt(p.cTime)).toISOString(),
      }))
    })
  }

  async placeOrder(params: {
    symbol: string
    side: 'buy' | 'sell'
    type: 'market' | 'limit'
    size: number
    price?: number
  }): Promise<{ orderId: string }> {
    return retry(async () => {
      const body: Record<string, unknown> = {
        symbol: params.symbol,
        side: params.side,
        orderType: params.type,
        size: params.size.toString(),
        force: 'gtc',
      }

      if (params.type === 'limit' && params.price) {
        body.price = params.price.toString()
      }

      const data = await this.request<any>(
        'POST',
        '/api/v2/spot/trade/place-order',
        body,
        true
      )

      return { orderId: data.orderId }
    })
  }

  async cancelOrder(symbol: string, orderId: string): Promise<void> {
    await this.request(
      'POST',
      '/api/v2/spot/trade/cancel-order',
      { symbol, orderId },
      true
    )
  }

  async getOrders(symbol?: string): Promise<any[]> {
    const path = symbol
      ? `/api/v2/spot/trade/unfilled-orders?symbol=${symbol}`
      : '/api/v2/spot/trade/unfilled-orders'

    return retry(() =>
      this.request<any[]>('GET', path, undefined, true)
    )
  }
}

export const bitgetService = new BitgetService()
