'use client'
import { useWebSocket } from '@/hooks/useWebSocket'
import { Toaster } from '@/components/ui/Toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function WsProvider({ children }: { children: React.ReactNode }) {
  useWebSocket()
  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <WsProvider>
        {children}
        <Toaster />
      </WsProvider>
    </ErrorBoundary>
  )
}
