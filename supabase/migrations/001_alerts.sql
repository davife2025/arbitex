-- ─────────────────────────────────────────
--  ARBITEX — Alerts Migration
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.alert_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN DEFAULT FALSE,
  email_address TEXT,
  telegram_enabled BOOLEAN DEFAULT FALSE,
  telegram_chat_id TEXT,
  notify_signal_generated BOOLEAN DEFAULT TRUE,
  notify_signal_triggered  BOOLEAN DEFAULT TRUE,
  notify_signal_expired    BOOLEAN DEFAULT FALSE,
  notify_stop_hit          BOOLEAN DEFAULT TRUE,
  notify_target_hit        BOOLEAN DEFAULT TRUE,
  min_confidence TEXT DEFAULT 'medium' CHECK (min_confidence IN ('low','medium','high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own alert prefs" ON public.alert_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.alert_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email','telegram')),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  error TEXT
);

ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own alert log" ON public.alert_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER update_alert_preferences_updated_at
  BEFORE UPDATE ON public.alert_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
