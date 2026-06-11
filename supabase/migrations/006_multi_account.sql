-- ─────────────────────────────────────────
--  ARBITEX — Multi-Account Migration
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.trading_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'bitget',
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  passphrase_encrypted TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  label_color TEXT DEFAULT '#00E5FF',
  note TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own accounts" ON public.trading_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_accounts_user    ON public.trading_accounts(user_id);
CREATE INDEX idx_accounts_default ON public.trading_accounts(user_id, is_default);

-- Market commentary cache
CREATE TABLE IF NOT EXISTS public.market_commentary (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  commentary TEXT NOT NULL,
  symbols TEXT[] NOT NULL,
  market_mood TEXT CHECK (market_mood IN ('bullish','bearish','neutral','mixed')),
  key_levels JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_commentary_generated ON public.market_commentary(generated_at DESC);

CREATE TRIGGER update_trading_accounts_updated_at
  BEFORE UPDATE ON public.trading_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
