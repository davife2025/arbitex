'use client'
import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import { toast } from '@/components/ui/Toast'
import type { ApiResponse } from '@arbitex/types'
import type { WatchlistItem } from '@/types/advanced'

const DEMO_USER_ID = 'demo-user'

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<WatchlistItem[]>>(
        `/api/watchlist/${DEMO_USER_ID}`
      )
      if (res.success && res.data) setItems(res.data)
    } catch (err) {
      console.error('useWatchlist fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const add = useCallback(async (symbol: string, note?: string) => {
    try {
      const res = await api.post<ApiResponse<WatchlistItem>>('/api/watchlist', {
        user_id: DEMO_USER_ID, symbol, note,
      })
      if (res.success && res.data) {
        setItems(prev => [res.data!, ...prev.filter(i => i.symbol !== symbol)])
        toast.success(`${symbol} added to watchlist`)
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }, [])

  const remove = useCallback(async (symbol: string) => {
    try {
      await api.delete(`/api/watchlist/${DEMO_USER_ID}/${symbol}`)
      setItems(prev => prev.filter(i => i.symbol !== symbol))
      toast.success(`${symbol} removed from watchlist`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }, [])

  const setAlerts = useCallback(async (
    symbol: string,
    alertAbove?: number | null,
    alertBelow?: number | null
  ) => {
    try {
      const res = await api.post<ApiResponse<WatchlistItem>>(
        `/api/watchlist/${DEMO_USER_ID}/${symbol}/alerts`,
        { alert_above: alertAbove, alert_below: alertBelow }
      )
      if (res.success && res.data) {
        setItems(prev => prev.map(i => i.symbol === symbol ? res.data! : i))
        toast.success(`Price alerts set for ${symbol}`)
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }, [])

  const isWatched = useCallback(
    (symbol: string) => items.some(i => i.symbol === symbol),
    [items]
  )

  useEffect(() => { fetch() }, [fetch])

  return { items, loading, fetch, add, remove, setAlerts, isWatched }
}
