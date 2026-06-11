'use client'
import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { useSignalsStore } from '@/store/signals'
import type { ApiResponse } from '@arbitex/types'
import type { AdvancedSignalResponse, ConfluenceResult, SizingResult, BacktestResult } from '@/types/advanced'

export function useAdvancedSignals() {
  const { addSignal } = useSignalsStore()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [confluence, setConfluence] = useState<ConfluenceResult | null>(null)
  const [sizing, setSizing] = useState<SizingResult | null>(null)
  const [backtest, setBacktest] = useState<BacktestResult | null>(null)

  const generateAdvanced = useCallback(async (
    symbol: string,
    maxRiskPct = 0.01
  ): Promise<AdvancedSignalResponse | null> => {
    setIsAnalyzing(true)
    try {
      const res = await api.post<ApiResponse<AdvancedSignalResponse>>(
        '/api/signals/advanced',
        { symbol, max_risk_pct: maxRiskPct }
      )
      if (res.success && res.data) {
        setConfluence(res.data.confluence)
        setSizing(res.data.sizing)
        if (res.data.signal) addSignal(res.data.signal)
        return res.data
      }
      return null
    } catch (err) {
      console.error('generateAdvanced error:', err)
      return null
    } finally {
      setIsAnalyzing(false)
    }
  }, [addSignal])

  const fetchConfluence = useCallback(async (symbol: string) => {
    try {
      const res = await api.get<ApiResponse<ConfluenceResult>>(
        `/api/signals/confluence/${symbol}`
      )
      if (res.success && res.data) setConfluence(res.data)
    } catch (err) {
      console.error('fetchConfluence error:', err)
    }
  }, [])

  const fetchBacktest = useCallback(async (
    symbol: string,
    interval = '1h',
    days = 30
  ) => {
    try {
      const res = await api.get<ApiResponse<BacktestResult>>(
        `/api/signals/backtest/${symbol}?interval=${interval}&days=${days}`
      )
      if (res.success && res.data) setBacktest(res.data)
    } catch (err) {
      console.error('fetchBacktest error:', err)
    }
  }, [])

  return {
    isAnalyzing,
    confluence,
    sizing,
    backtest,
    generateAdvanced,
    fetchConfluence,
    fetchBacktest,
  }
}
