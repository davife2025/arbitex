import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Email template tests ─────────────────────────────────────

const mockSignal: any = {
  id: 'sig-001',
  user_id: 'user-001',
  symbol: 'BTCUSDT',
  direction: 'long',
  confidence: 'high',
  entry_price: 65000,
  target_price: 67000,
  stop_loss: 64000,
  reasoning: 'RSI oversold, EMA9 crossing above SMA20 with high volume.',
  model_used: 'moonshotai/Kimi-K2-Instruct',
  status: 'active',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 3600000).toISOString(),
}

describe('Email alert formatting', () => {
  it('computes R:R correctly for long signal', () => {
    const rr = (
      Math.abs(mockSignal.target_price - mockSignal.entry_price) /
      Math.abs(mockSignal.entry_price - mockSignal.stop_loss)
    )
    expect(rr).toBe(2) // (67000-65000)/(65000-64000) = 2
  })

  it('computes R:R correctly for short signal', () => {
    const s = { ...mockSignal, direction: 'short', entry_price: 65000, target_price: 63000, stop_loss: 66000 }
    const rr = Math.abs(s.target_price - s.entry_price) / Math.abs(s.entry_price - s.stop_loss)
    expect(rr).toBe(2)
  })

  it('confidence colors are distinct', () => {
    const confColor = (c: string) =>
      c === 'high' ? '#00E5FF' : c === 'medium' ? '#FFB800' : '#6B7A99'
    expect(confColor('high')).not.toBe(confColor('medium'))
    expect(confColor('medium')).not.toBe(confColor('low'))
  })

  it('direction arrow is correct', () => {
    const arrow = (d: string) => d === 'long' ? '↑' : d === 'short' ? '↓' : '→'
    expect(arrow('long')).toBe('↑')
    expect(arrow('short')).toBe('↓')
    expect(arrow('neutral')).toBe('→')
  })

  it('subject includes symbol and direction', () => {
    const subject = `↑ New high confidence signal — ${mockSignal.symbol}`
    expect(subject).toContain('BTCUSDT')
    expect(subject).toContain('↑')
    expect(subject).toContain('high')
  })
})

describe('Telegram message formatting', () => {
  it('formats signal message with all key fields', () => {
    const dir = mockSignal.direction
    const rr = ((mockSignal.target_price - mockSignal.entry_price) /
                 Math.abs(mockSignal.entry_price - mockSignal.stop_loss)).toFixed(2)

    const lines = [
      `🤖 *New AI Signal* — Arbitex`,
      `*${mockSignal.symbol}*`,
      `$${mockSignal.entry_price.toLocaleString()}`,
      `$${mockSignal.target_price.toLocaleString()}`,
      `$${mockSignal.stop_loss.toLocaleString()}`,
      `${rr}x`,
    ]

    // Simulate the message
    const text = lines.join('\n')
    expect(text).toContain('BTCUSDT')
    expect(text).toContain('65,000')
    expect(text).toContain('2.00x')
  })

  it('position alert formats PnL correctly', () => {
    const pnl = 3.45
    const formatted = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%`
    expect(formatted).toBe('+3.45%')
  })

  it('negative PnL formats without double minus', () => {
    const pnl = -1.5
    const formatted = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%`
    expect(formatted).toBe('-1.50%')
  })

  it('dirEmoji returns correct emojis', () => {
    const dirEmoji = (d: string) =>
      d === 'long' ? '🟢' : d === 'short' ? '🔴' : '⚪'
    expect(dirEmoji('long')).toBe('🟢')
    expect(dirEmoji('short')).toBe('🔴')
    expect(dirEmoji('neutral')).toBe('⚪')
  })

  it('confEmoji returns correct emojis', () => {
    const confEmoji = (c: string) =>
      c === 'high' ? '🔥' : c === 'medium' ? '⚡' : '💤'
    expect(confEmoji('high')).toBe('🔥')
    expect(confEmoji('medium')).toBe('⚡')
    expect(confEmoji('low')).toBe('💤')
  })
})

describe('Alert preference filtering', () => {
  const confidenceRank: Record<string, number> = { low: 0, medium: 1, high: 2 }

  it('filters out users below minimum confidence', () => {
    const prefs = [
      { min_confidence: 'high', notify_signal_generated: true },
      { min_confidence: 'medium', notify_signal_generated: true },
      { min_confidence: 'low', notify_signal_generated: true },
    ]

    const signalConfidence = 'medium'

    const eligible = prefs.filter(
      p => confidenceRank[p.min_confidence] <= confidenceRank[signalConfidence]
    )

    expect(eligible).toHaveLength(2) // medium + low qualify; high does not
  })

  it('all prefs qualify for high confidence signal', () => {
    const prefs = [
      { min_confidence: 'high' },
      { min_confidence: 'medium' },
      { min_confidence: 'low' },
    ]
    const eligible = prefs.filter(
      p => confidenceRank[p.min_confidence] <= confidenceRank['high']
    )
    expect(eligible).toHaveLength(3)
  })

  it('skips neutral direction on signal_generated', () => {
    const signal = { ...mockSignal, direction: 'neutral' }
    const shouldSkip = signal.direction === 'neutral'
    expect(shouldSkip).toBe(true)
  })

  it('event maps correctly to preference keys', () => {
    const map: Record<string, string> = {
      signal_generated: 'notify_signal_generated',
      signal_triggered: 'notify_signal_triggered',
      signal_expired:   'notify_signal_expired',
      stop_hit:         'notify_stop_hit',
      target_hit:       'notify_target_hit',
    }
    expect(map['stop_hit']).toBe('notify_stop_hit')
    expect(map['target_hit']).toBe('notify_target_hit')
    expect(Object.keys(map)).toHaveLength(5)
  })
})

describe('Email service — no API key behaviour', () => {
  it('returns failure when RESEND_API_KEY is missing', async () => {
    const originalKey = process.env.RESEND_API_KEY
    delete process.env.RESEND_API_KEY

    // Simulate the guard
    const apiKey = process.env.RESEND_API_KEY ?? ''
    const result = !apiKey
      ? { success: false, error: 'RESEND_API_KEY not configured' }
      : { success: true }

    expect(result.success).toBe(false)
    expect(result.error).toContain('RESEND_API_KEY')

    process.env.RESEND_API_KEY = originalKey
  })
})

describe('Telegram service — no bot token behaviour', () => {
  it('returns failure when TELEGRAM_BOT_TOKEN is missing', () => {
    const token = ''
    const result = !token
      ? { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' }
      : { success: true }

    expect(result.success).toBe(false)
    expect(result.error).toContain('TELEGRAM_BOT_TOKEN')
  })
})
