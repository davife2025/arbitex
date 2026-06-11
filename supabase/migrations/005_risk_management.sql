-- ─────────────────────────────────────────
--  ARBITEX — Risk Management Migration
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.risk_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,

  -- Daily loss circuit breaker
  daily_loss_limit_pct NUMERIC(6,2) DEFAULT 5.0,
  daily_loss_limit_usdt NUMERIC(20,8),
  circuit_breaker_enabled BOOLEAN DEFAULT TRUE,
  circuit_breaker_triggered BOOLEAN DEFAULT FALSE,
  circuit_breaker_reset_at DATE,

  -- Position limits
  max_open_positions INTEGER DEFAULT 5,
  max_position_size_pct NUMERIC(6,2) DEFAULT 10.0,
  max_concentration_pct NUMERIC(6,2) DEFAULT 30.0,

  -- Drawdown limits
  max_drawdown_pct NUMERIC(6,2) DEFAULT 20.0,
  drawdown_alert_pct NUMERIC(6,2) DEFAULT 10.0,

  -- Volatility filter
  pause_on_high_volatility BOOLEAN DEFAULT FALSE,
  volatility_threshold_pct NUMERIC(6,2) DEFAULT 5.0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.risk_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own risk profile" ON public.risk_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Daily P&L tracking for circuit breaker
CREATE TABLE IF NOT EXISTS public.daily_pnl (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL DEFAULT CURRENT_DATE,
  realized_pnl_usdt NUMERIC(20,8) DEFAULT 0,
  unrealized_pnl_usdt NUMERIC(20,8) DEFAULT 0,
  starting_equity NUMERIC(20,8),
  UNIQUE(user_id, trade_date)
);

ALTER TABLE public.daily_pnl ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own daily pnl" ON public.daily_pnl
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_daily_pnl_user ON public.daily_pnl(user_id);
CREATE INDEX idx_daily_pnl_date ON public.daily_pnl(trade_date DESC);

CREATE TRIGGER update_risk_profiles_updated_at
  BEFORE UPDATE ON public.risk_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
