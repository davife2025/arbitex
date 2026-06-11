import type { AISignal, CandleInterval, SignalDirection } from '@arbitex/types'

export interface TimeframeAnalysis {
  interval: CandleInterval
  weight: number
  direction: SignalDirection
  rsi: number
  trend: 'bullish' | 'bearish' | 'neutral'
  ema_cross: 'bullish' | 'bearish' | 'neutral'
  volume_signal: 'high' | 'normal' | 'low'
  score: number
}

export interface ConfluenceResult {
  symbol: string
  composite_score: number
  direction: SignalDirection
  confidence: 'low' | 'medium' | 'high'
  aligned_timeframes: number
  total_timeframes: number
  timeframes: TimeframeAnalysis[]
  key_support: number
  key_resistance: number
  atr: number
}

export interface SizingResult {
  recommended_size: number
  position_value_usdt: number
  risk_amount_usdt: number
  reward_amount_usdt: number
  risk_pct_of_equity: number
  position_pct_of_equity: number
  risk_reward_ratio: number
  kelly_fraction: number
  rationale: string
  warnings: string[]
}

export interface AdvancedSignalResponse {
  confluence: ConfluenceResult
  signal: AISignal | null
  sizing: SizingResult | null
  message?: string
}

export interface TradeResult {
  signal_id: string
  symbol: string
  direction: 'long' | 'short'
  entry_price: number
  exit_price: number
  exit_reason: 'target' | 'stop' | 'expired'
  pnl_pct: number
  pnl_usdt: number
  risk_reward_ratio: number
  bars_held: number
  entry_time: string
  exit_time: string
}

export interface BacktestResult {
  symbol: string
  period_start: string
  period_end: string
  total_signals: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  expired_trades: number
  win_rate: number
  avg_win_pct: number
  avg_loss_pct: number
  profit_factor: number
  total_pnl_pct: number
  max_drawdown_pct: number
  sharpe_ratio: number
  trades: TradeResult[]
}

// ── Performance ──────────────────────────────────────────────

export interface SymbolStats {
  symbol: string
  total: number
  wins: number
  win_rate: number
  total_pnl_pct: number
}

export interface ConfidenceStats {
  confidence: string
  total: number
  wins: number
  win_rate: number
  avg_pnl_pct: number
}

export interface EquityPoint {
  date: string
  cumulative_pnl_pct: number
  signal_count: number
}

export interface PerformanceSummary {
  total_signals: number
  resolved: number
  pending: number
  wins: number
  losses: number
  expired: number
  win_rate: number
  avg_win_pct: number
  avg_loss_pct: number
  total_pnl_pct: number
  profit_factor: number
  best_signal: any | null
  worst_signal: any | null
  sharpe_ratio: number
  avg_rr_ratio: number
  by_symbol: SymbolStats[]
  by_confidence: ConfidenceStats[]
  equity_curve: EquityPoint[]
}

export interface SignalOutcome {
  id: string
  signal_id: string
  symbol: string
  direction: string
  confidence: string
  entry_price: number
  exit_price: number
  target_price: number
  stop_loss: number
  outcome: 'win' | 'loss' | 'expired' | 'pending'
  pnl_pct: number
  pnl_usdt: number
  risk_reward_ratio: number
  bars_held: number
  model_used: string
  resolved_at: string
  created_at: string
}

// ── Paper Trading ────────────────────────────────────────────

export interface PaperAccount {
  id: string
  user_id: string
  balance_usdt: number
  initial_balance: number
  total_pnl_usdt: number
  total_pnl_pct: number
  created_at: string
  updated_at: string
}

export interface PaperPosition {
  id: string
  user_id: string
  signal_id: string | null
  symbol: string
  side: 'long' | 'short'
  size: number
  entry_price: number
  current_price: number
  mark_price: number
  target_price: number
  stop_loss: number
  unrealized_pnl_usdt: number
  unrealized_pnl_pct: number
  status: 'open' | 'closed' | 'stopped' | 'targeted'
  opened_at: string
  closed_at?: string
  realized_pnl_usdt?: number
  realized_pnl_pct?: number
}

export interface PaperTrade {
  id: string
  user_id: string
  position_id: string
  symbol: string
  side: string
  size: number
  price: number
  action: 'open' | 'close' | 'stop' | 'target'
  pnl_usdt?: number
  pnl_pct?: number
  executed_at: string
}

export interface PaperSummary {
  account: PaperAccount
  total_equity: number
  unrealized_pnl_usdt: number
  open_positions: PaperPosition[]
  recent_trades: PaperTrade[]
}

// ── Watchlist ────────────────────────────────────────────────

export interface WatchlistItem {
  id: string
  user_id: string
  symbol: string
  note: string | null
  price_alert_above: number | null
  price_alert_below: number | null
  alert_triggered_above: boolean
  alert_triggered_below: boolean
  added_at: string
}

// ── Strategies ───────────────────────────────────────────────

export interface Strategy {
  id: string
  user_id: string
  name: string
  description: string | null
  enabled: boolean
  symbols: string[]
  min_confidence: 'low' | 'medium' | 'high'
  min_confluence_score: number
  required_timeframe_alignment: number
  signal_direction: 'any' | 'long' | 'short'
  auto_paper_trade: boolean
  paper_size_usdt: number
  auto_alert: boolean
  total_triggers: number
  last_triggered_at: string | null
  created_at: string
  updated_at: string
}

export interface StrategyTrigger {
  id: string
  strategy_id: string
  signal_id: string
  user_id: string
  symbol: string
  confluence_score: number
  paper_position_id: string | null
  triggered_at: string
  ai_signals?: any
}

// ── Order Book ───────────────────────────────────────────────

export interface OrderBookLevel {
  price: number
  size: number
  total: number
  depth_pct: number
}

export interface OrderBook {
  symbol: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  spread: number
  spread_pct: number
  mid_price: number
  bid_depth: number
  ask_depth: number
  imbalance: number
  timestamp: number
}

// ── Market Commentary ────────────────────────────────────────

export interface MarketCommentary {
  id: string
  commentary: string
  symbols: string[]
  market_mood: 'bullish' | 'bearish' | 'neutral' | 'mixed'
  key_levels: Record<string, { support: number; resistance: number }>
  generated_at: string
  expires_at: string
}

// ── Trading Accounts ─────────────────────────────────────────

export interface TradingAccount {
  id: string
  user_id: string
  name: string
  exchange: string
  is_default: boolean
  is_active: boolean
  label_color: string
  note: string | null
  last_synced_at: string | null
  created_at: string
}

// ── Journal ──────────────────────────────────────────────────

export type JournalMood = 'confident' | 'uncertain' | 'fearful' | 'greedy' | 'neutral'

export interface JournalEntry {
  id: string
  user_id: string
  title: string
  body: string | null
  mood: JournalMood
  tags: string[]
  linked_signal_id: string | null
  linked_order_id: string | null
  linked_paper_position_id: string | null
  pnl_usdt: number | null
  pnl_pct: number | null
  lessons_learned: string | null
  mistakes: string | null
  created_at: string
  updated_at: string
}

export interface JournalStats {
  total_entries: number
  by_mood: Record<string, number>
  by_tag: Record<string, number>
  avg_pnl_pct: number
  best_entry: JournalEntry | null
  worst_entry: JournalEntry | null
  streak: number
}

// ── Notifications ─────────────────────────────────────────────

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  icon: string
  read: boolean
  action_url: string | null
  metadata: Record<string, any>
  created_at: string
}

// ── Rate Limits ───────────────────────────────────────────────

export interface EndpointStats {
  endpoint: string
  count: number
  avg_ms: number
  error_count: number
  error_rate_pct: number
  last_called: string
}

export interface RateLimitStats {
  total_requests: number
  requests_last_hour: number
  requests_last_minute: number
  avg_response_ms: number
  error_rate_pct: number
  by_endpoint: EndpointStats[]
  timeline: { minute: string; count: number; errors: number }[]
}
