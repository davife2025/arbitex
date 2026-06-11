-- ─────────────────────────────────────────
--  ARBITEX — Watchlist & Strategies Migration
-- ─────────────────────────────────────────

-- Watchlist
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  note TEXT,
  price_alert_above NUMERIC(20,8),
  price_alert_below NUMERIC(20,8),
  alert_triggered_above BOOLEAN DEFAULT FALSE,
  alert_triggered_below BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watchlist" ON public.watchlist
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_watchlist_user   ON public.watchlist(user_id);
CREATE INDEX idx_watchlist_symbol ON public.watchlist(symbol);

-- Automated strategies
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,

  -- Trigger conditions
  symbols TEXT[] NOT NULL,
  min_confidence TEXT DEFAULT 'medium' CHECK (min_confidence IN ('low','medium','high')),
  min_confluence_score NUMERIC(4,2) DEFAULT 0.2,
  required_timeframe_alignment INTEGER DEFAULT 2,
  signal_direction TEXT DEFAULT 'any' CHECK (signal_direction IN ('any','long','short')),

  -- Execution config
  auto_paper_trade BOOLEAN DEFAULT FALSE,
  paper_size_usdt NUMERIC(10,2) DEFAULT 500,
  auto_alert BOOLEAN DEFAULT TRUE,

  -- Stats
  total_triggers INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own strategies" ON public.strategies
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_strategies_user    ON public.strategies(user_id);
CREATE INDEX idx_strategies_enabled ON public.strategies(enabled);

-- Strategy trigger log
CREATE TABLE IF NOT EXISTS public.strategy_triggers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES public.ai_signals(id),
  user_id UUID REFERENCES public.profiles(id),
  symbol TEXT NOT NULL,
  confluence_score NUMERIC(4,2),
  paper_position_id UUID,
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.strategy_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own strategy triggers" ON public.strategy_triggers
  FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER update_strategies_updated_at
  BEFORE UPDATE ON public.strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
