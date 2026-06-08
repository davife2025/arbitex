// TODO Session 2: fetch live market data from API
import { useMarketStore } from '@/store/market'

export function useMarket() {
  const { tickers, candles, selectedSymbol, setSelectedSymbol } = useMarketStore()
  return { tickers, candles, selectedSymbol, setSelectedSymbol }
}
