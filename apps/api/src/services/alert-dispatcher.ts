import { supabaseAdmin } from './supabase'
import { emailAlertService, type AlertEvent } from './email-alert'
import { telegramAlertService } from './telegram-alert'
import type { AISignal } from '@arbitex/types'

interface AlertPreferences {
  user_id: string
  email_enabled: boolean
  email_address: string | null
  telegram_enabled: boolean
  telegram_chat_id: string | null
  notify_signal_generated: boolean
  notify_signal_triggered: boolean
  notify_signal_expired: boolean
  notify_stop_hit: boolean
  notify_target_hit: boolean
  min_confidence: 'low' | 'medium' | 'high'
}

const confidenceRank: Record<string, number> = { low: 0, medium: 1, high: 2 }

const eventToPreferenceKey: Record<AlertEvent, keyof AlertPreferences> = {
  signal_generated: 'notify_signal_generated',
  signal_triggered: 'notify_signal_triggered',
  signal_expired:   'notify_signal_expired',
  stop_hit:         'notify_stop_hit',
  target_hit:       'notify_target_hit',
}

// ── Log to Supabase ──────────────────────────────────────────

async function logAlert(
  userId: string,
  channel: 'email' | 'telegram',
  eventType: AlertEvent,
  payload: object,
  success: boolean,
  error?: string
) {
  await supabaseAdmin.from('alert_log').insert({
    user_id: userId,
    channel,
    event_type: eventType,
    payload,
    success,
    error: error ?? null,
  })
}

// ── Main dispatcher ──────────────────────────────────────────

export class AlertDispatcher {

  // Fetch preferences for a single user
  private async getPrefs(userId: string): Promise<AlertPreferences | null> {
    const { data, error } = await supabaseAdmin
      .from('alert_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) return null
    return data as AlertPreferences
  }

  // Fetch all users who want alerts for a given event + confidence level
  private async getAllPrefs(
    event: AlertEvent,
    minConfidenceNeeded: 'low' | 'medium' | 'high'
  ): Promise<AlertPreferences[]> {
    const prefKey = eventToPreferenceKey[event]

    const { data } = await supabaseAdmin
      .from('alert_preferences')
      .select('*')
      .eq(prefKey as string, true)

    if (!data) return []

    // Filter by min confidence threshold
    return (data as AlertPreferences[]).filter(
      (p) => confidenceRank[p.min_confidence] <= confidenceRank[minConfidenceNeeded]
    )
  }

  // Dispatch signal alert to all subscribed users
  async dispatchSignalAlert(signal: AISignal, event: AlertEvent): Promise<void> {
    // Skip neutral signals for most events
    if (signal.direction === 'neutral' && event === 'signal_generated') return

    // Get all users subscribed to this event + confidence level
    const prefs = await this.getAllPrefs(event, signal.confidence)
    if (prefs.length === 0) return

    const payload = {
      signal_id: signal.id,
      symbol: signal.symbol,
      direction: signal.direction,
      confidence: signal.confidence,
      entry_price: signal.entry_price,
      target_price: signal.target_price,
      stop_loss: signal.stop_loss,
    }

    await Promise.allSettled(
      prefs.flatMap((pref) => {
        const jobs: Promise<void>[] = []

        // Email
        if (pref.email_enabled && pref.email_address) {
          jobs.push(
            emailAlertService
              .sendSignalAlert(pref.email_address, signal, event)
              .then((res) => logAlert(pref.user_id, 'email', event, payload, res.success, res.error))
          )
        }

        // Telegram
        if (pref.telegram_enabled && pref.telegram_chat_id) {
          jobs.push(
            telegramAlertService
              .sendSignalAlert(pref.telegram_chat_id, signal, event)
              .then((res) => logAlert(pref.user_id, 'telegram', event, payload, res.success, res.error))
          )
        }

        return jobs
      })
    )
  }

  // Dispatch a position alert to a specific user
  async dispatchPositionAlert(
    userId: string,
    symbol: string,
    event: 'stop_hit' | 'target_hit',
    entryPrice: number,
    exitPrice: number,
    pnlPct: number
  ): Promise<void> {
    const pref = await this.getPrefs(userId)
    if (!pref) return

    const prefKey = eventToPreferenceKey[event]
    if (!pref[prefKey]) return

    const payload = { symbol, event, entryPrice, exitPrice, pnlPct }

    const jobs: Promise<void>[] = []

    if (pref.email_enabled && pref.email_address) {
      // Build a minimal signal-like object for the email template
      const mockSignal = {
        id: '', user_id: userId, symbol,
        direction: pnlPct >= 0 ? 'long' : 'short',
        confidence: 'medium', entry_price: entryPrice,
        target_price: exitPrice, stop_loss: exitPrice,
        reasoning: `Position ${event === 'target_hit' ? 'reached target' : 'hit stop loss'} at $${exitPrice.toLocaleString()}. PnL: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`,
        model_used: '', status: 'triggered',
        created_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
      } as AISignal

      jobs.push(
        emailAlertService
          .sendSignalAlert(pref.email_address, mockSignal, event)
          .then((res) => logAlert(userId, 'email', event, payload, res.success, res.error))
      )
    }

    if (pref.telegram_enabled && pref.telegram_chat_id) {
      jobs.push(
        telegramAlertService
          .sendPositionAlert(pref.telegram_chat_id, symbol, event, entryPrice, exitPrice, pnlPct)
          .then((res) => logAlert(userId, 'telegram', event, payload, res.success, res.error))
      )
    }

    await Promise.allSettled(jobs)
  }
}

export const alertDispatcher = new AlertDispatcher()
