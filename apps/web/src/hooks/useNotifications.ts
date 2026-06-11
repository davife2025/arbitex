'use client'
import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import type { ApiResponse } from '@arbitex/types'
import type { Notification } from '@/types/advanced'

const DEMO_USER_ID = 'demo-user'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<Notification[]>>(
        `/api/notifications/${DEMO_USER_ID}${unreadOnly ? '?unread=true' : ''}`
      )
      if (res.success && res.data) setNotifications(res.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<{ count: number }>>(
        `/api/notifications/${DEMO_USER_ID}/count`
      )
      if (res.success && res.data) setUnreadCount(res.data.count)
    } catch (err) { console.error(err) }
  }, [])

  const markRead = useCallback(async (ids: string[]) => {
    try {
      await api.post(`/api/notifications/${DEMO_USER_ID}/read`, { ids })
      setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - ids.length))
    } catch (err) { console.error(err) }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await api.post(`/api/notifications/${DEMO_USER_ID}/read-all`, {})
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) { console.error(err) }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/notifications/${DEMO_USER_ID}/${id}`)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (err) { console.error(err) }
  }, [])

  useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications, fetchUnreadCount])

  return { notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead, remove }
}
