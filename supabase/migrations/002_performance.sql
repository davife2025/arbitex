-- ─────────────────────────────────────────
--  ARBITEX — Performance Tracking Migration
-- ─────────────────────────────────────────

-- Signal outcomes — one row per resolved signal
CREATE TABLE IF NOT EXISTS public.signal_outcomes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  signal_id UUID REFERENCES public.ai_signals(id) ON DELETE CASCADE UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  confidence TEXT NOT NULL,
  entry_price NUMERIC(20,8) NOT NULL,
  exit_price NUMERIC(20,8),
  target_price NUMERIC(20,8) NOT NULL,
  stop_loss NUMERIC(20,8) NOT NULL,
  outcome TEXT CHECK (outcome IN ('win','loss','expired','pending')) DEFAULT 'pending',
  pnl_pct NUMERIC(10,4),
  pnl_usdt NUMERIC(20,4),
  risk_reward_ratio NUMERIC(8,4),
  bars_held INTEGER,
  model_used TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.signal_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own outcomes" ON public.signal_outcomes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages outcomes" ON public.signal_outcomes
  FOR ALL USING (true);

CREATE INDEX idx_outcomes_user    ON public.signal_outcomes(user_id);
CREATE INDEX idx_outcomes_symbol  ON public.signal_outcomes(symbol);
CREATE INDEX idx_outcomes_outcome ON public.signal_outcomes(outcome);
CREATE INDEX idx_outcomes_created ON public.signal_outcomes(created_at DESC);

-- Daily performance snapshots (aggregated per user per day)
CREATE TABLE IF NOT EXISTS public.performance_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_signals INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  expired INTEGER DEFAULT 0,
  win_rate NUMERIC(6,2),
  total_pnl_pct NUMERIC(10,4),
  avg_win_pct NUMERIC(10,4),
  avg_loss_pct NUMERIC(10,4),
  profit_factor NUMERIC(8,3),
  best_signal_id UUID,
  worst_signal_id UUID,
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own snapshots" ON public.performance_snapshots
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages snapshots" ON public.performance_snapshots
  FOR ALL USING (true);

CREATE INDEX idx_snapshots_user ON public.performance_snapshots(user_id);
CREATE INDEX idx_snapshots_date ON public.performance_snapshots(snapshot_date DESC);
