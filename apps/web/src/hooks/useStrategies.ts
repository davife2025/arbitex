'use client'
import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import { toast } from '@/components/ui/Toast'
import type { ApiResponse } from '@arbitex/types'
import type { Strategy, StrategyTrigger } from '@/types/advanced'

const DEMO_USER_ID = 'demo-user'

export function useStrategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<Strategy[]>>(
        `/api/strategies/${DEMO_USER_ID}`
      )
      if (res.success && res.data) setStrategies(res.data)
    } catch (err) {
      console.error('useStrategies fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (params: Partial<Strategy>) => {
    try {
      const res = await api.post<ApiResponse<Strategy>>('/api/strategies', {
        user_id: DEMO_USER_ID, ...params,
      })
      if (res.success && res.data) {
        setStrategies(prev => [res.data!, ...prev])
        toast.success(`Strategy "${params.name}" created`)
        return res.data
      }
      return null
    } catch (err: any) {
      toast.error(err.message)
      return null
    }
  }, [])

  const update = useCallback(async (id: string, params: Partial<Strategy>) => {
    try {
      const res = await api.post<ApiResponse<Strategy>>(`/api/strategies/${id}`, params)
      if (res.success && res.data) {
        setStrategies(prev => prev.map(s => s.id === id ? res.data! : s))
        toast.success('Strategy updated')
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }, [])

  const toggle = useCallback(async (id: string, enabled: boolean) => {
    await update(id, { enabled })
  }, [update])

  const remove = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/strategies/${id}`)
      setStrategies(prev => prev.filter(s => s.id !== id))
      toast.success('Strategy deleted')
    } catch (err: any) {
      toast.error(err.message)
    }
  }, [])

  const run = useCallback(async (id: string) => {
    setRunning(id)
    try {
      const res = await api.post<ApiResponse<any>>(`/api/strategies/${id}/run`, {})
      if (res.success) {
        if (res.data?.triggered) {
          toast.success(`Strategy triggered on ${res.data.symbol}!`)
        } else {
          toast.info('Strategy ran — no conditions met')
        }
        await fetch()
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setRunning(null)
    }
  }, [fetch])

  const getTriggers = useCallback(async (id: string): Promise<StrategyTrigger[]> => {
    try {
      const res = await api.get<ApiResponse<StrategyTrigger[]>>(
        `/api/strategies/${id}/triggers`
      )
      return res.success ? res.data ?? [] : []
    } catch {
      return []
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return {
    strategies, loading, running,
    fetch, create, update, toggle, remove, run, getTriggers,
  }
}
