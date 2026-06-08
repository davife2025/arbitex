// TODO Session 2: Full Bitget REST + WebSocket implementation
import { config } from '@arbitex/config'
import type { Ticker, Candle, Order, Position, CandleInterval } from '@arbitex/types'

export class BitgetService {
  private readonly apiKey = process.env.BITGET_API_KEY!
  private readonly apiSecret = process.env.BITGET_API_SECRET!
  private readonly passphrase = process.env.BITGET_PASSPHRASE!
  private readonly baseUrl = config.bitget.baseUrl

  // Session 2: implement HMAC-SHA256 signing
  private sign(_timestamp: string, _method: string, _path: string, _body = ''): string {
    throw new Error('Not implemented — Session 2')
  }

  private async request<T>(method: string, path: string, body?: unknown, auth = false): Promise<T> {
    const ts = Date.now().toString()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ACCESS-KEY': this.apiKey,
      'ACCESS-TIMESTAMP': ts,
      'locale': 'en-US',
    }

    if (auth) {
      headers['ACCESS-SIGN'] = this.sign(ts, method, path, body ? JSON.stringify(body) : '')
      headers['ACCESS-PASSPHRASE'] = this.passphrase
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    return res.json()
  }

  // Market Data
  async getTickers(): Promise<Ticker[]> {
    // TODO Session 2
    throw new Error('Not implemented — Session 2')
  }

  async getTicker(symbol: string): Promise<Ticker> {
    // TODO Session 2
    void symbol
    throw new Error('Not implemented — Session 2')
  }

  async getCandles(symbol: string, interval: CandleInterval, limit = 100): Promise<Candle[]> {
    // TODO Session 2
    void symbol; void interval; void limit
    throw new Error('Not implemented — Session 2')
  }

  // Account (authenticated)
  async getBalance(): Promise<{ available: number; total: number }> {
    // TODO Session 2
    throw new Error('Not implemented — Session 2')
  }

  async getPositions(): Promise<Position[]> {
    // TODO Session 2
    throw new Error('Not implemented — Session 2')
  }

  async placeOrder(params: {
    symbol: string
    side: 'buy' | 'sell'
    type: 'market' | 'limit'
    size: number
    price?: number
  }): Promise<Order> {
    // TODO Session 2
    void params
    throw new Error('Not implemented — Session 2')
  }

  async cancelOrder(orderId: string): Promise<void> {
    // TODO Session 2
    void orderId
    throw new Error('Not implemented — Session 2')
  }
}

export const bitgetService = new BitgetService()
