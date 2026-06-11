'use client'
import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import { toast } from '@/components/ui/Toast'
import type { ApiResponse } from '@arbitex/types'
import type { JournalEntry, JournalStats } from '@/types/advanced'

const DEMO_USER_ID = 'demo-user'

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [stats, setStats] = useState<JournalStats | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const fetchEntries = useCallback(async (filters?: Record<string, string>) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams(filters ?? {}).toString()
      const res = await api.get<ApiResponse<JournalEntry[]>>(
        `/api/journal/${DEMO_USER_ID}${qs ? '?' + qs : ''}`
      )
      if (res.success && res.data) setEntries(res.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<JournalStats>>(`/api/journal/${DEMO_USER_ID}/meta/stats`)
      if (res.success && res.data) setStats(res.data)
    } catch (err) { console.error(err) }
  }, [])

  const fetchTags = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<string[]>>(`/api/journal/${DEMO_USER_ID}/meta/tags`)
      if (res.success && res.data) setTags(res.data)
    } catch (err) { console.error(err) }
  }, [])

  const create = useCallback(async (params: Partial<JournalEntry>): Promise<JournalEntry | null> => {
    try {
      const res = await api.post<ApiResponse<JournalEntry>>('/api/journal', {
        user_id: DEMO_USER_ID, ...params,
      })
      if (res.success && res.data) {
        setEntries(prev => [res.data!, ...prev])
        toast.success('Journal entry saved')
        fetchTags()
        return res.data
      }
      return null
    } catch (err: any) { toast.error(err.message); return null }
  }, [fetchTags])

  const update = useCallback(async (id: string, params: Partial<JournalEntry>) => {
    try {
      const res = await api.post<ApiResponse<JournalEntry>>(
        `/api/journal/${DEMO_USER_ID}/${id}`, params
      )
      if (res.success && res.data) {
        setEntries(prev => prev.map(e => e.id === id ? res.data! : e))
        toast.success('Entry updated')
      }
    } catch (err: any) { toast.error(err.message) }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/journal/${DEMO_USER_ID}/${id}`)
      setEntries(prev => prev.filter(e => e.id !== id))
      toast.success('Entry deleted')
    } catch (err: any) { toast.error(err.message) }
  }, [])

  useEffect(() => { fetchEntries(); fetchStats(); fetchTags() }, [fetchEntries, fetchStats, fetchTags])

  return { entries, stats, tags, loading, fetchEntries, fetchStats, create, update, remove }
}
