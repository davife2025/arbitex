// TODO Session 2: fetch portfolio from API
import { usePortfolioStore } from '@/store/portfolio'

export function usePortfolio() {
  const { portfolio, orders } = usePortfolioStore()
  return { portfolio, orders }
}
