-- ─────────────────────────────────────────
--  ARBITEX — Paper Trading Migration
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.paper_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  balance_usdt NUMERIC(20,8) NOT NULL DEFAULT 10000,
  initial_balance NUMERIC(20,8) NOT NULL DEFAULT 10000,
  total_pnl_usdt NUMERIC(20,8) DEFAULT 0,
  total_pnl_pct NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.paper_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own paper account" ON public.paper_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.paper_positions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES public.ai_signals(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long','short')),
  size NUMERIC(20,8) NOT NULL,
  entry_price NUMERIC(20,8) NOT NULL,
  current_price NUMERIC(20,8),
  mark_price NUMERIC(20,8),
  target_price NUMERIC(20,8) NOT NULL,
  stop_loss NUMERIC(20,8) NOT NULL,
  unrealized_pnl_usdt NUMERIC(20,8) DEFAULT 0,
  unrealized_pnl_pct NUMERIC(10,4) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','stopped','targeted')),
  close_price NUMERIC(20,8),
  realized_pnl_usdt NUMERIC(20,8),
  realized_pnl_pct NUMERIC(10,4),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE public.paper_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own paper positions" ON public.paper_positions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_paper_positions_user   ON public.paper_positions(user_id);
CREATE INDEX idx_paper_positions_status ON public.paper_positions(status);
CREATE INDEX idx_paper_positions_symbol ON public.paper_positions(symbol);

CREATE TABLE IF NOT EXISTS public.paper_trades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.paper_positions(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  size NUMERIC(20,8) NOT NULL,
  price NUMERIC(20,8) NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('open','close','stop','target')),
  pnl_usdt NUMERIC(20,8),
  pnl_pct NUMERIC(10,4),
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own paper trades" ON public.paper_trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_paper_trades_user ON public.paper_trades(user_id);

CREATE TRIGGER update_paper_accounts_updated_at
  BEFORE UPDATE ON public.paper_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
