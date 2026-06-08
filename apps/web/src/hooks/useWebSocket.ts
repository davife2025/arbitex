'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useMarketStore } from '@/store/market'
import { usePortfolioStore } from '@/store/portfolio'
import { useSignalsStore } from '@/store/signals'
import type { WsEvent } from '@arbitex/types'

const WS_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace('http', 'ws') + '/ws'

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { setTickers } = useMarketStore()
  const { setPortfolio, setOrders } = usePortfolioStore()
  const { addSignal } = useSignalsStore()

  const handleEvent = useCallback(
    (event: WsEvent) => {
      switch (event.type) {
        case 'ticker_update':
          setTickers(event.payload as any)
          break
        case 'portfolio_update':
          setPortfolio(event.payload as any)
          break
        case 'order_update':
          // Partial update — refetch handled by usePortfolio hook
          break
        case 'signal_update':
          addSignal(event.payload as any)
          break
        default:
          break
      }
    },
    [setTickers, setPortfolio, addSignal]
  )

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      console.log('🔌 Arbitex WS connected')
      ws.send(JSON.stringify({ type: 'subscribe', symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] }))
    }

    ws.onmessage = (msg) => {
      try {
        const event: WsEvent = JSON.parse(msg.data)
        handleEvent(event)
      } catch {}
    }

    ws.onclose = () => {
      console.log('🔌 WS disconnected — reconnecting in 3s')
      reconnectRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = (err) => {
      console.error('WS error:', err)
      ws.close()
    }

    wsRef.current = ws
  }, [handleEvent])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return wsRef
}
