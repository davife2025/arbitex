'use client'
import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import type { ApiResponse } from '@arbitex/types'
import type { RateLimitStats } from '@/types/advanced'

export function useRateLimits() {
  const [stats, setStats] = useState<RateLimitStats | null>(null)
  const [quota, setQuota] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, quotaRes] = await Promise.all([
        api.get<ApiResponse<RateLimitStats>>('/api/rate-limits/stats'),
        api.get<ApiResponse<any>>('/api/rate-limits/bitget-quota'),
      ])
      if (statsRes.success && statsRes.data) setStats(statsRes.data)
      if (quotaRes.success && quotaRes.data) setQuota(quotaRes.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [fetchStats])

  return { stats, quota, loading, fetchStats }
}
