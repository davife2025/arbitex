-- ─────────────────────────────────────────
--  ARBITEX — Leaderboard & Exports
-- ─────────────────────────────────────────

-- Public leaderboard snapshots (opt-in, anonymised by default)
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Trader',
  avatar_color TEXT DEFAULT '#00E5FF',
  is_public BOOLEAN DEFAULT FALSE,

  -- Paper trading stats
  paper_total_return_pct NUMERIC(10,4) DEFAULT 0,
  paper_win_rate NUMERIC(6,2) DEFAULT 0,
  paper_total_trades INTEGER DEFAULT 0,
  paper_profit_factor NUMERIC(8,3) DEFAULT 0,
  paper_sharpe NUMERIC(8,3) DEFAULT 0,
  paper_max_drawdown_pct NUMERIC(8,3) DEFAULT 0,

  -- Signal stats
  signal_win_rate NUMERIC(6,2) DEFAULT 0,
  signal_total INTEGER DEFAULT 0,
  signal_avg_rr NUMERIC(6,3) DEFAULT 0,

  -- Rank (computed periodically)
  rank INTEGER,
  rank_change INTEGER DEFAULT 0,

  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public leaderboard readable by all" ON public.leaderboard
  FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Users manage own leaderboard entry" ON public.leaderboard
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_leaderboard_rank   ON public.leaderboard(rank);
CREATE INDEX idx_leaderboard_return ON public.leaderboard(paper_total_return_pct DESC);
CREATE INDEX idx_leaderboard_date   ON public.leaderboard(snapshot_date DESC);

-- Export history log
CREATE TABLE IF NOT EXISTS public.export_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('journal_csv','performance_csv','signals_csv','full_json')),
  record_count INTEGER,
  exported_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.export_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own exports" ON public.export_log
  FOR SELECT USING (auth.uid() = user_id);
