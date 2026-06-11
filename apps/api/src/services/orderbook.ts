import { config } from '@arbitex/config'
import { broadcaster } from './ws-broadcaster'

export interface OrderBookLevel {
  price: number
  size: number
  total: number       // cumulative size
  depth_pct: number   // % of max side depth
}

export interface OrderBook {
  symbol: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  spread: number
  spread_pct: number
  mid_price: number
  bid_depth: number   // total bid liquidity in USDT
  ask_depth: number
  imbalance: number   // -1 to 1: negative = more asks (bearish), positive = more bids (bullish)
  timestamp: number
}

export class OrderBookService {
  private readonly baseUrl = config.bitget.baseUrl
  private cache = new Map<string, { book: OrderBook; fetchedAt: number }>()
  private readonly CACHE_TTL_MS = 2000 // 2 second cache

  async fetch(symbol: string, depth = 20): Promise<OrderBook> {
    const cached = this.cache.get(symbol)
    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL_MS) {
      return cached.book
    }

    const url = `${this.baseUrl}/api/v2/spot/market/orderbook?symbol=${symbol}&limit=${depth}&type=step0`
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', locale: 'en-US' },
    })

    if (!res.ok) throw new Error(`Orderbook fetch failed: ${res.status}`)

    const data = await res.json()
    if (data.code !== '00000') throw new Error(`Bitget error: ${data.msg}`)

    const raw = data.data
    const bidsRaw: [string, string][] = raw.bids ?? []
    const asksRaw: [string, string][] = raw.asks ?? []

    // Parse and compute cumulative totals
    const parseLevels = (levels: [string, string][]): OrderBookLevel[] => {
      let cumulative = 0
      return levels.map(([price, size]) => {
        cumulative += parseFloat(size)
        return {
          price: parseFloat(price),
          size: parseFloat(size),
          total: cumulative,
          depth_pct: 0, // filled after
        }
      })
    }

    const bids = parseLevels(bidsRaw)
    const asks = parseLevels(asksRaw)

    // Compute depth percentages
    const maxBidTotal = bids[bids.length - 1]?.total ?? 1
    const maxAskTotal = asks[asks.length - 1]?.total ?? 1
    bids.forEach(b => { b.depth_pct = (b.total / maxBidTotal) * 100 })
    asks.forEach(a => { a.depth_pct = (a.total / maxAskTotal) * 100 })

    const topBid = bids[0]?.price ?? 0
    const topAsk = asks[0]?.price ?? 0
    const midPrice = (topBid + topAsk) / 2
    const spread = topAsk - topBid
    const spreadPct = midPrice > 0 ? (spread / midPrice) * 100 : 0

    // Depth in USDT
    const bidDepth = bids.reduce((s, b) => s + b.size * b.price, 0)
    const askDepth = asks.reduce((s, a) => s + a.size * a.price, 0)
    const totalDepth = bidDepth + askDepth
    const imbalance = totalDepth > 0 ? (bidDepth - askDepth) / totalDepth : 0

    const book: OrderBook = {
      symbol,
      bids,
      asks,
      spread: parseFloat(spread.toFixed(8)),
      spread_pct: parseFloat(spreadPct.toFixed(4)),
      mid_price: parseFloat(midPrice.toFixed(8)),
      bid_depth: parseFloat(bidDepth.toFixed(2)),
      ask_depth: parseFloat(askDepth.toFixed(2)),
      imbalance: parseFloat(imbalance.toFixed(4)),
      timestamp: Date.now(),
    }

    this.cache.set(symbol, { book, fetchedAt: Date.now() })
    return book
  }

  // Broadcast order book snapshot via WS
  async broadcastSnapshot(symbol: string): Promise<void> {
    try {
      const book = await this.fetch(symbol)
      broadcaster.broadcast('ticker_update', { type: 'orderbook', ...book })
    } catch {
      // silent fail — non-critical
    }
  }
}

export const orderBookService = new OrderBookService()
