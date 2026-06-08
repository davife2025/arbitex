'use client'
import { useWebSocket } from '@/hooks/useWebSocket'

// Mounts the WebSocket connection for the whole app
export function Providers({ children }: { children: React.ReactNode }) {
  useWebSocket()
  return <>{children}</>
}
