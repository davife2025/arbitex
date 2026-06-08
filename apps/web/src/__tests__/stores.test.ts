import { describe, it, expect, beforeEach } from 'vitest'
import { useMarketStore } from '@/store/market'
import { usePortfolioStore } from '@/store/portfolio'
import { useSignalsStore } from '@/store/signals'
import type { Ticker, AISignal, Portfolio } from '@arbitex/types'

const makeTicker = (symbol: string, price: number): Ticker => ({
  symbol, last_price: price, bid: price - 1, ask: price + 1,
  volume_24h: 10000, change_24h: 1.5, timestamp: Date.now(),
})

const makeSignal = (id: string, direction: 'long' | 'short' | 'neutral' = 'long'): AISignal => ({
  id, user_id: 'u1', symbol: 'BTCUSDT', direction,
  confidence: 'high', entry_price: 65000, target_price: 67000,
  stop_loss: 64000, reasoning: 'Test signal', status: 'active',
  model_used: 'kimi', created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 3600000).toISOString(),
})

describe('MarketStore', () => {
  beforeEach(() => useMarketStore.setState({ tickers: [], candles: [], selectedSymbol: 'BTCUSDT' }))

  it('setTickers updates tickers', () => {
    const tickers = [makeTicker('BTCUSDT', 65000), makeTicker('ETHUSDT', 3200)]
    useMarketStore.getState().setTickers(tickers)
    expect(useMarketStore.getState().tickers).toHaveLength(2)
  })

  it('setSelectedSymbol updates symbol', () => {
    useMarketStore.getState().setSelectedSymbol('ETHUSDT')
    expect(useMarketStore.getState().selectedSymbol).toBe('ETHUSDT')
  })

  it('initialises with BTCUSDT selected', () => {
    expect(useMarketStore.getState().selectedSymbol).toBe('BTCUSDT')
  })
})

describe('PortfolioStore', () => {
  beforeEach(() => usePortfolioStore.setState({ portfolio: null, orders: [] }))

  it('setPortfolio stores the portfolio', () => {
    const p: Portfolio = {
      user_id: 'u1', total_equity: 10000, available_balance: 8000,
      unrealized_pnl: 200, realized_pnl: 0, positions: [], updated_at: new Date().toISOString(),
    }
    usePortfolioStore.getState().setPortfolio(p)
    expect(usePortfolioStore.getState().portfolio?.total_equity).toBe(10000)
  })

  it('setOrders stores orders', () => {
    usePortfolioStore.getState().setOrders([{ id: 'o1' } as any])
    expect(usePortfolioStore.getState().orders).toHaveLength(1)
  })
})

describe('SignalsStore', () => {
  beforeEach(() => useSignalsStore.setState({ signals: [], isGenerating: false }))

  it('setSignals replaces all signals', () => {
    useSignalsStore.getState().setSignals([makeSignal('s1'), makeSignal('s2')])
    expect(useSignalsStore.getState().signals).toHaveLength(2)
  })

  it('addSignal prepends new signal', () => {
    useSignalsStore.getState().setSignals([makeSignal('s1')])
    useSignalsStore.getState().addSignal(makeSignal('s2'))
    expect(useSignalsStore.getState().signals[0].id).toBe('s2')
  })

  it('addSignal deduplicates by id', () => {
    useSignalsStore.getState().setSignals([makeSignal('s1')])
    useSignalsStore.getState().addSignal(makeSignal('s1')) // same id
    expect(useSignalsStore.getState().signals).toHaveLength(1)
  })

  it('updateSignal patches a signal by id', () => {
    useSignalsStore.getState().setSignals([makeSignal('s1')])
    useSignalsStore.getState().updateSignal('s1', { status: 'triggered' })
    expect(useSignalsStore.getState().signals[0].status).toBe('triggered')
  })

  it('setIsGenerating toggles flag', () => {
    useSignalsStore.getState().setIsGenerating(true)
    expect(useSignalsStore.getState().isGenerating).toBe(true)
  })
})
