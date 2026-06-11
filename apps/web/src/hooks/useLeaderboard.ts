'use client'
import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import { toast } from '@/components/ui/Toast'
import type { ApiResponse } from '@arbitex/types'
import type { LeaderboardEntry } from '@/types/advanced'

const DEMO_USER_ID = 'demo-user'

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState<'return' | 'win_rate' | 'sharpe'>('return')

  const fetchLeaderboard = useCallback(async (sort = sortBy) => {
    setLoading(true)
    try {
      const [lb, me] = await Promise.all([
        api.get<ApiResponse<LeaderboardEntry[]>>(`/api/leaderboard?sort=${sort}&limit=20`),
        api.get<ApiResponse<LeaderboardEntry>>(`/api/leaderboard/me/${DEMO_USER_ID}`),
      ])
      if (lb.success && lb.data) setEntries(lb.data)
      if (me.success && me.data) setMyEntry(me.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [sortBy])

  const updateConfig = useCallback(async (config: {
    display_name?: string
    avatar_color?: string
    is_public?: boolean
  }) => {
    try {
      const res = await api.post<ApiResponse<LeaderboardEntry>>(
        `/api/leaderboard/config/${DEMO_USER_ID}`, config
      )
      if (res.success && res.data) {
        setMyEntry(res.data)
        toast.success('Leaderboard profile updated')
      }
    } catch (err: any) { toast.error(err.message) }
  }, [])

  const snapshotMe = useCallback(async () => {
    try {
      await api.post(`/api/leaderboard/snapshot/${DEMO_USER_ID}`, {})
      toast.success('Stats submitted to leaderboard')
      await fetchLeaderboard()
    } catch (err: any) { toast.error(err.message) }
  }, [fetchLeaderboard])

  const changeSort = useCallback((sort: 'return' | 'win_rate' | 'sharpe') => {
    setSortBy(sort)
    fetchLeaderboard(sort)
  }, [fetchLeaderboard])

  useEffect(() => { fetchLeaderboard() }, [fetchLeaderboard])

  return { entries, myEntry, loading, sortBy, fetchLeaderboard, updateConfig, snapshotMe, changeSort }
}
