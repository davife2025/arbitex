-- ─────────────────────────────────────────
--  ARBITEX — Journal & Notifications
-- ─────────────────────────────────────────

-- Trade journal entries
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  mood TEXT CHECK (mood IN ('confident','uncertain','fearful','greedy','neutral')) DEFAULT 'neutral',
  tags TEXT[] DEFAULT '{}',
  linked_signal_id UUID REFERENCES public.ai_signals(id),
  linked_order_id UUID,
  linked_paper_position_id UUID REFERENCES public.paper_positions(id),
  pnl_usdt NUMERIC(20,8),
  pnl_pct NUMERIC(10,4),
  lessons_learned TEXT,
  mistakes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journal" ON public.journal_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_journal_user    ON public.journal_entries(user_id);
CREATE INDEX idx_journal_created ON public.journal_entries(created_at DESC);
CREATE INDEX idx_journal_tags    ON public.journal_entries USING GIN(tags);
CREATE INDEX idx_journal_mood    ON public.journal_entries(mood);

-- In-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  icon TEXT DEFAULT '🔔',
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user    ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread  ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- API rate limit tracking
CREATE TABLE IF NOT EXISTS public.api_request_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  error TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_log_endpoint ON public.api_request_log(endpoint);
CREATE INDEX idx_api_log_logged   ON public.api_request_log(logged_at DESC);

-- Auto-update timestamps
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
