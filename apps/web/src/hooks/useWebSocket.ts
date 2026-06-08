// TODO Session 2: WebSocket connection to API
import { useEffect, useRef } from 'react'
import type { WsEvent } from '@arbitex/types'

export function useWebSocket(onEvent: (event: WsEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(
      process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') + '/ws' ?? 'ws://localhost:4000/ws'
    )

    ws.onmessage = (msg) => {
      try {
        const event: WsEvent = JSON.parse(msg.data)
        onEvent(event)
      } catch {}
    }

    wsRef.current = ws
    return () => ws.close()
  }, [onEvent])

  return wsRef
}
