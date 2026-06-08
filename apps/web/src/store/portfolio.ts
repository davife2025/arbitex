import { create } from 'zustand'
import type { Portfolio, Order } from '@arbitex/types'

interface PortfolioState {
  portfolio: Portfolio | null
  orders: Order[]
  setPortfolio: (portfolio: Portfolio) => void
  setOrders: (orders: Order[]) => void
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  portfolio: null,
  orders: [],
  setPortfolio: (portfolio) => set({ portfolio }),
  setOrders: (orders) => set({ orders }),
}))
