import { supabaseAdmin } from './supabase'
import { alertDispatcher } from './alert-dispatcher'
import { broadcaster } from './ws-broadcaster'

export interface WatchlistItem {
  id: string
  user_id: string
  symbol: string
  note: string | null
  price_alert_above: number | null
  price_alert_below: number | null
  alert_triggered_above: boolean
  alert_triggered_below: boolean
  added_at: string
}

export class WatchlistService {

  async getAll(userId: string): Promise<WatchlistItem[]> {
    const { data, error } = await supabaseAdmin
      .from('watchlist')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as WatchlistItem[]
  }

  async add(userId: string, symbol: string, note?: string): Promise<WatchlistItem> {
    const { data, error } = await supabaseAdmin
      .from('watchlist')
      .upsert({ user_id: userId, symbol: symbol.toUpperCase(), note: note ?? null },
        { onConflict: 'user_id,symbol' })
      .select().single()
    if (error) throw new Error(error.message)
    return data as WatchlistItem
  }

  async remove(userId: string, symbol: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('symbol', symbol.toUpperCase())
    if (error) throw new Error(error.message)
  }

  async setPriceAlerts(
    userId: string,
    symbol: string,
    alertAbove?: number | null,
    alertBelow?: number | null
  ): Promise<WatchlistItem> {
    const { data, error } = await supabaseAdmin
      .from('watchlist')
      .update({
        price_alert_above: alertAbove ?? null,
        price_alert_below: alertBelow ?? null,
        alert_triggered_above: false,
        alert_triggered_below: false,
      })
      .eq('user_id', userId)
      .eq('symbol', symbol.toUpperCase())
      .select().single()
    if (error) throw new Error(error.message)
    return data as WatchlistItem
  }

  // Called by market poller on every tick
  async checkPriceAlerts(symbol: string, currentPrice: number): Promise<void> {
    const { data: items } = await supabaseAdmin
      .from('watchlist')
      .select('*')
      .eq('symbol', symbol)
      .or('price_alert_above.not.is.null,price_alert_below.not.is.null')

    if (!items?.length) return

    for (const item of items as WatchlistItem[]) {
      // Above alert
      if (
        item.price_alert_above &&
        currentPrice >= item.price_alert_above &&
        !item.alert_triggered_above
      ) {
        await supabaseAdmin
          .from('watchlist')
          .update({ alert_triggered_above: true })
          .eq('id', item.id)

        broadcaster.broadcast('signal_update', {
          type: 'price_alert',
          symbol,
          direction: 'above',
          price: currentPrice,
          threshold: item.price_alert_above,
        })

        // Send notification via alert dispatcher
        this.sendPriceAlertNotification(
          item.user_id, symbol, 'above', currentPrice, item.price_alert_above
        ).catch(() => {})
      }

      // Below alert
      if (
        item.price_alert_below &&
        currentPrice <= item.price_alert_below &&
        !item.alert_triggered_below
      ) {
        await supabaseAdmin
          .from('watchlist')
          .update({ alert_triggered_below: true })
          .eq('id', item.id)

        broadcaster.broadcast('signal_update', {
          type: 'price_alert',
          symbol,
          direction: 'below',
          price: currentPrice,
          threshold: item.price_alert_below,
        })

        this.sendPriceAlertNotification(
          item.user_id, symbol, 'below', currentPrice, item.price_alert_below
        ).catch(() => {})
      }
    }
  }

  private async sendPriceAlertNotification(
    userId: string,
    symbol: string,
    direction: 'above' | 'below',
    price: number,
    threshold: number
  ): Promise<void> {
    const { data: prefs } = await supabaseAdmin
      .from('alert_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!prefs) return

    const message = `🔔 Price Alert: ${symbol} is ${direction} $${threshold.toLocaleString()} — current price: $${price.toLocaleString()}`

    const { telegramAlertService } = await import('./telegram-alert')
    const { emailAlertService } = await import('./email-alert')

    if (prefs.telegram_enabled && prefs.telegram_chat_id) {
      const { TelegramAlertService } = await import('./telegram-alert')
      const svc = new TelegramAlertService()
      // Use internal send via the service
      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: prefs.telegram_chat_id,
            text: message,
            parse_mode: 'Markdown',
          }),
        }
      ).catch(() => {})
    }
  }
}

export const watchlistService = new WatchlistService()
