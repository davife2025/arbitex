// ─────────────────────────────────────────
//  ARBITEX — Shared Types
// ─────────────────────────────────────────

export interface User {
  id: string
  email: string
  created_at: string
  bitget_connected: boolean
}

export interface Ticker {
  symbol: string
  last_price: number
  bid: number
  ask: number
  volume_24h: number
  change_24h: number
  timestamp: number
}

export interface Candle {
  symbol: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: number
  interval: CandleInterval
}

export type CandleInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

export interface Order {
  id: string
  user_id: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  size: number
  price?: number
  status: OrderStatus
  filled_size: number
  avg_fill_price?: number
  created_at: string
  updated_at: string
}

export type OrderStatus = 'pending' | 'open' | 'filled' | 'cancelled' | 'failed'

export interface Position {
  id: string
  user_id: string
  symbol: string
  side: 'long' | 'short'
  size: number
  entry_price: number
  mark_price: number
  unrealized_pnl: number
  leverage: number
  created_at: string
}

export interface Portfolio {
  user_id: string
  total_equity: number
  available_balance: number
  unrealized_pnl: number
  realized_pnl: number
  positions: Position[]
  updated_at: string
}

export type SignalDirection = 'long' | 'short' | 'neutral'
export type SignalConfidence = 'low' | 'medium' | 'high'
export type SignalStatus = 'active' | 'triggered' | 'expired' | 'cancelled'

export interface AISignal {
  id: string
  user_id: string
  symbol: string
  direction: SignalDirection
  confidence: SignalConfidence
  entry_price: number
  target_price: number
  stop_loss: number
  reasoning: string
  status: SignalStatus
  created_at: string
  expires_at: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

export type WsEventType =
  | 'ticker_update'
  | 'position_update'
  | 'order_update'
  | 'signal_update'
  | 'portfolio_update'

export interface WsEvent<T = unknown> {
  type: WsEventType
  payload: T
  timestamp: number
}
