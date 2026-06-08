-- ─────────────────────────────────────────
--  ARBITEX — Supabase Database Schema
-- ─────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
--  PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  bitget_connected BOOLEAN DEFAULT FALSE,
  bitget_api_key_hash TEXT,          -- hashed, never store raw
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ─────────────────────────────────────────
--  MARKET DATA CACHE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tickers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol TEXT NOT NULL,
  last_price NUMERIC(20, 8) NOT NULL,
  bid NUMERIC(20, 8),
  ask NUMERIC(20, 8),
  volume_24h NUMERIC(30, 8),
  change_24h NUMERIC(10, 4),
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickers_symbol ON public.tickers(symbol);
CREATE INDEX idx_tickers_fetched_at ON public.tickers(fetched_at DESC);

CREATE TABLE IF NOT EXISTS public.candles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol TEXT NOT NULL,
  interval TEXT NOT NULL,
  open NUMERIC(20, 8) NOT NULL,
  high NUMERIC(20, 8) NOT NULL,
  low NUMERIC(20, 8) NOT NULL,
  close NUMERIC(20, 8) NOT NULL,
  volume NUMERIC(30, 8) NOT NULL,
  candle_time TIMESTAMPTZ NOT NULL,
  UNIQUE(symbol, interval, candle_time)
);

CREATE INDEX idx_candles_symbol_interval ON public.candles(symbol, interval);
CREATE INDEX idx_candles_time ON public.candles(candle_time DESC);

-- ─────────────────────────────────────────
--  ORDERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  bitget_order_id TEXT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  type TEXT NOT NULL CHECK (type IN ('market', 'limit')),
  size NUMERIC(20, 8) NOT NULL,
  price NUMERIC(20, 8),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'open', 'filled', 'cancelled', 'failed')),
  filled_size NUMERIC(20, 8) DEFAULT 0,
  avg_fill_price NUMERIC(20, 8),
  signal_id UUID,               -- linked signal if AI-generated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);

-- ─────────────────────────────────────────
--  POSITIONS SNAPSHOT
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  size NUMERIC(20, 8) NOT NULL,
  entry_price NUMERIC(20, 8) NOT NULL,
  mark_price NUMERIC(20, 8),
  unrealized_pnl NUMERIC(20, 8) DEFAULT 0,
  leverage INTEGER DEFAULT 1,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own positions" ON public.positions
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_positions_user ON public.positions(user_id);

-- ─────────────────────────────────────────
--  AI SIGNALS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_signals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('long', 'short', 'neutral')),
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  entry_price NUMERIC(20, 8) NOT NULL,
  target_price NUMERIC(20, 8) NOT NULL,
  stop_loss NUMERIC(20, 8) NOT NULL,
  reasoning TEXT NOT NULL,
  model_used TEXT DEFAULT 'moonshotai/Kimi-K2-Instruct',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'triggered', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.ai_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own signals" ON public.ai_signals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own signals" ON public.ai_signals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_signals_user ON public.ai_signals(user_id);
CREATE INDEX idx_signals_status ON public.ai_signals(status);
CREATE INDEX idx_signals_expires ON public.ai_signals(expires_at);

-- ─────────────────────────────────────────
--  AUTO-UPDATE TIMESTAMPS
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
--  AUTO-CREATE PROFILE ON SIGNUP
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
