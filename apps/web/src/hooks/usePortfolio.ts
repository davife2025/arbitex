'use client'
import { useEffect, useCallback } from 'react'
import { usePortfolioStore } from '@/store/portfolio'
import { api } from '@/lib/api'
import type { ApiResponse, Order } from '@arbitex/types'

export function usePortfolio() {
  const { portfolio, orders, setPortfolio, setOrders } = usePortfolioStore()

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<any>>('/api/portfolio')
      if (res.success && res.data) setPortfolio(res.data)
    } catch (err) {
      console.error('fetchPortfolio error:', err)
    }
  }, [setPortfolio])

  const fetchOrders = useCallback(async (symbol?: string) => {
    try {
      const path = symbol ? `/api/orders?symbol=${symbol}` : '/api/orders'
      const res = await api.get<ApiResponse<Order[]>>(path)
      if (res.success && res.data) setOrders(res.data)
    } catch (err) {
      console.error('fetchOrders error:', err)
    }
  }, [setOrders])

  const placeOrder = useCallback(async (params: {
    symbol: string
    side: 'buy' | 'sell'
    type: 'market' | 'limit'
    size: number
    price?: number
    signal_id?: string
  }) => {
    const res = await api.post<ApiResponse<any>>('/api/orders', params)
    if (res.success) await fetchOrders()
    return res
  }, [fetchOrders])

  const cancelOrder = useCallback(async (orderId: string, symbol: string) => {
    const res = await api.delete<ApiResponse<any>>(`/api/orders/${orderId}?symbol=${symbol}`)
    if (res.success) await fetchOrders()
    return res
  }, [fetchOrders])

  // Poll portfolio every 10s
  useEffect(() => {
    fetchPortfolio()
    fetchOrders()
    const interval = setInterval(fetchPortfolio, 10000)
    return () => clearInterval(interval)
  }, [fetchPortfolio, fetchOrders])

  return { portfolio, orders, fetchPortfolio, fetchOrders, placeOrder, cancelOrder }
}
