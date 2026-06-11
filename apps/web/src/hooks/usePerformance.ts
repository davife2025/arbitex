'use client'
import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import type { ApiResponse } from '@arbitex/types'
import type { PerformanceSummary, SignalOutcome } from '@/types/advanced'

export function usePerformance(days = 30) {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [outcomes, setOutcomes] = useState<SignalOutcome[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSummary = useCallback(async (d = days) => {
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<PerformanceSummary>>(
        `/api/performance/summary?days=${d}`
      )
      if (res.success && res.data) setSummary(res.data)
    } catch (err) {
      console.error('fetchSummary error:', err)
    } finally {
      setLoading(false)
    }
  }, [days])

  const fetchOutcomes = useCallback(async (params?: {
    symbol?: string; outcome?: string; limit?: number
  }) => {
    try {
      const qs = new URLSearchParams()
      if (params?.symbol)  qs.set('symbol', params.symbol)
      if (params?.outcome) qs.set('outcome', params.outcome)
      if (params?.limit)   qs.set('limit', String(params.limit))
      const res = await api.get<ApiResponse<SignalOutcome[]>>(
        `/api/performance/outcomes${qs.toString() ? '?' + qs.toString() : ''}`
      )
      if (res.success && res.data) setOutcomes(res.data)
    } catch (err) {
      console.error('fetchOutcomes error:', err)
    }
  }, [])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  return { summary, outcomes, loading, fetchSummary, fetchOutcomes }
}
