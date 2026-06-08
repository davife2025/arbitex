import { create } from 'zustand'
import type { Ticker, Candle } from '@arbitex/types'

interface MarketState {
  tickers: Ticker[]
  candles: Candle[]
  selectedSymbol: string
  setTickers: (tickers: Ticker[]) => void
  setCandles: (candles: Candle[]) => void
  setSelectedSymbol: (symbol: string) => void
}

export const useMarketStore = create<MarketState>((set) => ({
  tickers: [],
  candles: [],
  selectedSymbol: 'BTCUSDT',
  setTickers: (tickers) => set({ tickers }),
  setCandles: (candles) => set({ candles }),
  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),
}))
