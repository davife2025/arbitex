'use client'
import { useEffect, useCallback } from 'react'
import { useMarketStore } from '@/store/market'
import { api } from '@/lib/api'
import type { ApiResponse, Ticker, Candle, CandleInterval } from '@arbitex/types'

export function useMarket() {
  const { tickers, candles, selectedSymbol, setTickers, setCandles, setSelectedSymbol } =
    useMarketStore()

  const fetchTickers = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<Ticker[]>>('/api/market/tickers')
      if (res.success && res.data) setTickers(res.data)
    } catch (err) {
      console.error('fetchTickers error:', err)
    }
  }, [setTickers])

  const fetchCandles = useCallback(
    async (symbol: string, interval: CandleInterval = '1h', limit = 100) => {
      try {
        const res = await api.get<ApiResponse<Candle[]>>(
          `/api/market/candles/${symbol}?interval=${interval}&limit=${limit}`
        )
        if (res.success && res.data) setCandles(res.data)
      } catch (err) {
        console.error('fetchCandles error:', err)
      }
    },
    [setCandles]
  )

  // Poll tickers every 5s
  useEffect(() => {
    fetchTickers()
    const interval = setInterval(fetchTickers, 5000)
    return () => clearInterval(interval)
  }, [fetchTickers])

  // Re-fetch candles when symbol changes
  useEffect(() => {
    fetchCandles(selectedSymbol)
  }, [selectedSymbol, fetchCandles])

  return { tickers, candles, selectedSymbol, setSelectedSymbol, fetchCandles }
}
