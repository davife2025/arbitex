'use client'
import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import { toast } from '@/components/ui/Toast'
import type { ApiResponse } from '@arbitex/types'
import type { PaperSummary, PaperPosition, PaperTrade, PaperAccount } from '@/types/advanced'

// In a real app this comes from Supabase auth context
const DEMO_USER_ID = 'demo-user'

export function usePaperTrading() {
  const [summary, setSummary] = useState<PaperSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<PaperSummary>>(
        `/api/paper/summary/${DEMO_USER_ID}`
      )
      if (res.success && res.data) setSummary(res.data)
    } catch (err) {
      console.error('fetchSummary error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const openFromSignal = useCallback(async (
    signalId: string,
    sizeUsdt: number
  ): Promise<PaperPosition | null> => {
    try {
      const res = await api.post<ApiResponse<PaperPosition>>(
        '/api/paper/positions/open-signal',
        { user_id: DEMO_USER_ID, signal_id: signalId, size_usdt: sizeUsdt }
      )
      if (res.success && res.data) {
        toast.success(`Paper position opened — ${res.data.symbol}`)
        await fetchSummary()
        return res.data
      }
      toast.error(res.error ?? 'Failed to open position')
      return null
    } catch (err: any) {
      toast.error(err.message)
      return null
    }
  }, [fetchSummary])

  const openManual = useCallback(async (params: {
    symbol: string
    side: 'long' | 'short'
    sizeUsdt: number
    entryPrice: number
    targetPrice: number
    stopLoss: number
  }): Promise<PaperPosition | null> => {
    try {
      const res = await api.post<ApiResponse<PaperPosition>>(
        '/api/paper/positions/open',
        { user_id: DEMO_USER_ID, ...params,
          size_usdt: params.sizeUsdt,
          entry_price: params.entryPrice,
          target_price: params.targetPrice,
          stop_loss: params.stopLoss,
        }
      )
      if (res.success && res.data) {
        toast.success(`Paper position opened — ${res.data.symbol}`)
        await fetchSummary()
        return res.data
      }
      toast.error(res.error ?? 'Failed to open position')
      return null
    } catch (err: any) {
      toast.error(err.message)
      return null
    }
  }, [fetchSummary])

  const closePosition = useCallback(async (
    positionId: string,
    closePrice: number
  ): Promise<void> => {
    try {
      const res = await api.post<ApiResponse<PaperPosition>>(
        `/api/paper/positions/${positionId}/close`,
        { close_price: closePrice, action: 'close' }
      )
      if (res.success) {
        toast.success('Position closed')
        await fetchSummary()
      } else {
        toast.error(res.error ?? 'Close failed')
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }, [fetchSummary])

  const resetAccount = useCallback(async (balance = 10000): Promise<void> => {
    try {
      const res = await api.post<ApiResponse<PaperAccount>>(
        `/api/paper/account/${DEMO_USER_ID}/reset`,
        { balance }
      )
      if (res.success) {
        toast.success(`Paper account reset to $${balance.toLocaleString()}`)
        await fetchSummary()
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }, [fetchSummary])

  // Poll every 5s to reflect MTM updates
  useEffect(() => {
    fetchSummary()
    const interval = setInterval(fetchSummary, 5000)
    return () => clearInterval(interval)
  }, [fetchSummary])

  return {
    summary,
    loading,
    fetchSummary,
    openFromSignal,
    openManual,
    closePosition,
    resetAccount,
  }
}
