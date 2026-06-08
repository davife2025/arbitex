'use client'
import { useEffect, useCallback } from 'react'
import { useSignalsStore } from '@/store/signals'
import { api } from '@/lib/api'
import type { AISignal, ApiResponse } from '@arbitex/types'

interface GenerateSignalParams {
  symbol: string
  interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  candle_limit?: number
}

interface BatchGenerateParams {
  symbols: string[]
  interval?: string
}

interface MarketOverview {
  overview: string
  tickers: any[]
}

export function useSignals() {
  const { signals, isGenerating, setSignals, setIsGenerating, addSignal } = useSignalsStore()

  const fetchSignals = useCallback(
    async (params?: { symbol?: string; status?: string; limit?: number }) => {
      try {
        const qs = new URLSearchParams()
        if (params?.symbol) qs.set('symbol', params.symbol)
        if (params?.status) qs.set('status', params.status)
        if (params?.limit) qs.set('limit', String(params.limit))

        const res = await api.get<ApiResponse<AISignal[]>>(
          `/api/signals${qs.toString() ? '?' + qs.toString() : ''}`
        )
        if (res.success && res.data) setSignals(res.data)
      } catch (err) {
        console.error('fetchSignals error:', err)
      }
    },
    [setSignals]
  )

  const generateSignal = useCallback(
    async (params: GenerateSignalParams): Promise<AISignal | null> => {
      setIsGenerating(true)
      try {
        const res = await api.post<ApiResponse<AISignal>>('/api/signals/generate', params)
        if (res.success && res.data) {
          addSignal(res.data)
          return res.data
        }
        return null
      } catch (err) {
        console.error('generateSignal error:', err)
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    [setIsGenerating, addSignal]
  )

  const generateBatch = useCallback(
    async (params: BatchGenerateParams) => {
      setIsGenerating(true)
      try {
        const res = await api.post<ApiResponse<{ signals: AISignal[]; errors: any[] }>>(
          '/api/signals/generate-batch',
          params
        )
        if (res.success && res.data) {
          for (const signal of res.data.signals) addSignal(signal)
          return res.data
        }
        return null
      } catch (err) {
        console.error('generateBatch error:', err)
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    [setIsGenerating, addSignal]
  )

  const updateSignalStatus = useCallback(
    async (id: string, status: 'triggered' | 'cancelled' | 'expired') => {
      try {
        const res = await api.post<ApiResponse<AISignal>>(`/api/signals/${id}/status`, { status })
        if (res.success && res.data) {
          setSignals(signals.map((s) => (s.id === id ? res.data! : s)))
        }
      } catch (err) {
        console.error('updateSignalStatus error:', err)
      }
    },
    [signals, setSignals]
  )

  const fetchMarketOverview = useCallback(async (): Promise<MarketOverview | null> => {
    try {
      const res = await api.get<ApiResponse<MarketOverview>>('/api/signals/market-overview')
      return res.success ? res.data ?? null : null
    } catch (err) {
      console.error('fetchMarketOverview error:', err)
      return null
    }
  }, [])

  // Fetch active signals on mount
  useEffect(() => {
    fetchSignals({ status: 'active' })
  }, [fetchSignals])

  return {
    signals,
    isGenerating,
    fetchSignals,
    generateSignal,
    generateBatch,
    updateSignalStatus,
    fetchMarketOverview,
  }
}
