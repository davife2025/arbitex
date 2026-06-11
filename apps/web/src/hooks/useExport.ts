'use client'
import { useState, useCallback } from 'react'
import { toast } from '@/components/ui/Toast'

const DEMO_USER_ID = 'demo-user'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function downloadFile(url: string, filename: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
  const count = res.headers.get('X-Record-Count')
  return count ? parseInt(count) : 0
}

export function useExport() {
  const [exporting, setExporting] = useState<string | null>(null)

  const exportJournal = useCallback(async () => {
    setExporting('journal')
    try {
      const count = await downloadFile(
        `${API_URL}/api/export/journal/${DEMO_USER_ID}`,
        `arbitex-journal-${new Date().toISOString().split('T')[0]}.csv`
      )
      toast.success(`Journal exported — ${count} entries`)
    } catch (err: any) { toast.error(err.message) } finally { setExporting(null) }
  }, [])

  const exportPerformance = useCallback(async () => {
    setExporting('performance')
    try {
      const count = await downloadFile(
        `${API_URL}/api/export/performance/${DEMO_USER_ID}`,
        `arbitex-performance-${new Date().toISOString().split('T')[0]}.csv`
      )
      toast.success(`Performance exported — ${count} trades`)
    } catch (err: any) { toast.error(err.message) } finally { setExporting(null) }
  }, [])

  const exportSignals = useCallback(async () => {
    setExporting('signals')
    try {
      const count = await downloadFile(
        `${API_URL}/api/export/signals/${DEMO_USER_ID}`,
        `arbitex-signals-${new Date().toISOString().split('T')[0]}.csv`
      )
      toast.success(`Signals exported — ${count} records`)
    } catch (err: any) { toast.error(err.message) } finally { setExporting(null) }
  }, [])

  const exportFull = useCallback(async () => {
    setExporting('full')
    try {
      const count = await downloadFile(
        `${API_URL}/api/export/full/${DEMO_USER_ID}`,
        `arbitex-full-export-${new Date().toISOString().split('T')[0]}.json`
      )
      toast.success(`Full export downloaded — ${count} records`)
    } catch (err: any) { toast.error(err.message) } finally { setExporting(null) }
  }, [])

  return { exporting, exportJournal, exportPerformance, exportSignals, exportFull }
}
