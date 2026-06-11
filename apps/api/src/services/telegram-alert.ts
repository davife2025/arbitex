import type { AISignal } from '@arbitex/types'
import type { AlertEvent } from './email-alert'

// ── Message formatters ───────────────────────────────────────

const dirEmoji = (d: string) =>
  d === 'long' ? '🟢' : d === 'short' ? '🔴' : '⚪'

const confEmoji = (c: string) =>
  c === 'high' ? '🔥' : c === 'medium' ? '⚡' : '💤'

const eventEmoji: Record<AlertEvent, string> = {
  signal_generated: '🤖',
  signal_triggered: '⚡',
  signal_expired:   '⏱',
  stop_hit:         '🛑',
  target_hit:       '🎯',
}

const eventLabel: Record<AlertEvent, string> = {
  signal_generated: 'New AI Signal',
  signal_triggered: 'Entry Triggered',
  signal_expired:   'Signal Expired',
  stop_hit:         'Stop Loss Hit',
  target_hit:       'Target Reached',
}

function formatSignalMessage(signal: AISignal, event: AlertEvent): string {
  const dir = signal.direction
  const rr = (
    Math.abs(signal.target_price - signal.entry_price) /
    Math.abs(signal.entry_price - signal.stop_loss)
  ).toFixed(2)

  const arrow = dir === 'long' ? '↑' : dir === 'short' ? '↓' : '→'

  return [
    `${eventEmoji[event]} *${eventLabel[event]}* — Arbitex`,
    ``,
    `*${signal.symbol}*  ${dirEmoji(dir)} ${arrow} ${dir.toUpperCase()}  ${confEmoji(signal.confidence)} ${signal.confidence.toUpperCase()}`,
    ``,
    `📍 Entry:   \`$${signal.entry_price.toLocaleString()}\``,
    `🎯 Target:  \`$${signal.target_price.toLocaleString()}\``,
    `🛑 Stop:    \`$${signal.stop_loss.toLocaleString()}\``,
    `📊 R:R:     \`${rr}x\``,
    ``,
    `💬 _${signal.reasoning}_`,
    ``,
    `🤖 ${signal.model_used?.split('/').pop() ?? 'Kimi K2'}  ·  ${new Date().toUTCString()}`,
  ].join('\n')
}

function formatPositionAlert(
  symbol: string,
  event: 'stop_hit' | 'target_hit',
  entryPrice: number,
  exitPrice: number,
  pnlPct: number
): string {
  const isWin = event === 'target_hit'
  return [
    `${eventEmoji[event]} *${eventLabel[event]}* — Arbitex`,
    ``,
    `*${symbol}*`,
    ``,
    `📍 Entry:  \`$${entryPrice.toLocaleString()}\``,
    `🏁 Exit:   \`$${exitPrice.toLocaleString()}\``,
    `${isWin ? '✅' : '❌'} PnL:    \`${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%\``,
    ``,
    `${new Date().toUTCString()}`,
  ].join('\n')
}

// ── Telegram Bot API sender ──────────────────────────────────

export class TelegramAlertService {
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN ?? ''
  private readonly apiBase = `https://api.telegram.org/bot`

  private async send(
    chatId: string,
    text: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.botToken) {
      console.warn('TELEGRAM_BOT_TOKEN not set — Telegram alert skipped')
      return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' }
    }

    try {
      const res = await fetch(
        `${this.apiBase}${this.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
          }),
        }
      )

      const data = await res.json()

      if (!data.ok) {
        return { success: false, error: `Telegram error: ${data.description}` }
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async sendSignalAlert(
    chatId: string,
    signal: AISignal,
    event: AlertEvent
  ): Promise<{ success: boolean; error?: string }> {
    const text = formatSignalMessage(signal, event)
    return this.send(chatId, text)
  }

  async sendPositionAlert(
    chatId: string,
    symbol: string,
    event: 'stop_hit' | 'target_hit',
    entryPrice: number,
    exitPrice: number,
    pnlPct: number
  ): Promise<{ success: boolean; error?: string }> {
    const text = formatPositionAlert(symbol, event, entryPrice, exitPrice, pnlPct)
    return this.send(chatId, text)
  }

  // Validate a chat ID by attempting to send a test ping
  async testConnection(chatId: string): Promise<{ success: boolean; error?: string }> {
    return this.send(
      chatId,
      '✅ *Arbitex* — Telegram alerts connected successfully!'
    )
  }
}

export const telegramAlertService = new TelegramAlertService()
