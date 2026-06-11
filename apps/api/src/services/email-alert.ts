import type { AISignal } from '@arbitex/types'

interface EmailPayload {
  to: string
  subject: string
  html: string
}

export type AlertEvent =
  | 'signal_generated'
  | 'signal_triggered'
  | 'signal_expired'
  | 'stop_hit'
  | 'target_hit'

// ── HTML email templates ─────────────────────────────────────

const baseStyle = `
  font-family: 'Inter', -apple-system, sans-serif;
  background: #080A0F;
  color: #E8EDF8;
  max-width: 560px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #1C2235;
`

const directionColor = (d: string) =>
  d === 'long' ? '#00C48C' : d === 'short' ? '#FF4757' : '#6B7A99'

const confidenceColor = (c: string) =>
  c === 'high' ? '#00E5FF' : c === 'medium' ? '#FFB800' : '#6B7A99'

function signalEmailHtml(signal: AISignal, event: AlertEvent): string {
  const dirColor = directionColor(signal.direction)
  const confColor = confidenceColor(signal.confidence)
  const arrow = signal.direction === 'long' ? '↑' : signal.direction === 'short' ? '↓' : '→'
  const rr = ((signal.target_price - signal.entry_price) /
               Math.abs(signal.entry_price - signal.stop_loss)).toFixed(2)

  const eventLabels: Record<AlertEvent, string> = {
    signal_generated: '🤖 New AI Signal Generated',
    signal_triggered: '⚡ Signal Entry Triggered',
    signal_expired:   '⏱ Signal Expired',
    stop_hit:         '🛑 Stop Loss Hit',
    target_hit:       '🎯 Target Price Reached',
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#04060A;">
  <div style="${baseStyle}">

    <!-- Header -->
    <div style="background:#0E1118;padding:20px 24px;border-bottom:1px solid #1C2235;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:20px;font-weight:800;letter-spacing:-0.5px;">
          <span style="color:#00E5FF;">Arbi</span><span style="color:#E8EDF8;">tex</span>
        </span>
        <span style="font-size:11px;font-family:monospace;color:#6B7A99;">AI Trading</span>
      </div>
    </div>

    <!-- Event banner -->
    <div style="background:#141820;padding:16px 24px;border-bottom:1px solid #1C2235;">
      <p style="margin:0;font-size:15px;font-weight:600;color:#E8EDF8;">${eventLabels[event]}</p>
      <p style="margin:4px 0 0;font-size:11px;font-family:monospace;color:#6B7A99;">
        ${new Date().toUTCString()}
      </p>
    </div>

    <!-- Signal core -->
    <div style="padding:24px;">

      <!-- Symbol + direction -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <span style="font-size:22px;font-weight:700;font-family:monospace;color:#E8EDF8;">
          ${signal.symbol}
        </span>
        <span style="
          background:${dirColor}22;
          color:${dirColor};
          border:1px solid ${dirColor}44;
          border-radius:999px;
          padding:3px 10px;
          font-size:12px;
          font-family:monospace;
          font-weight:600;
        ">${arrow} ${signal.direction.toUpperCase()}</span>
        <span style="
          background:${confColor}22;
          color:${confColor};
          border:1px solid ${confColor}44;
          border-radius:999px;
          padding:3px 10px;
          font-size:12px;
          font-family:monospace;
        ">${signal.confidence.toUpperCase()}</span>
      </div>

      <!-- Price levels -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:10px;text-align:center;background:#0E1118;border-radius:8px 0 0 8px;border:1px solid #1C2235;">
            <div style="font-size:10px;font-family:monospace;color:#6B7A99;margin-bottom:4px;">ENTRY</div>
            <div style="font-size:15px;font-family:monospace;font-weight:600;color:#E8EDF8;">
              $${signal.entry_price.toLocaleString()}
            </div>
          </td>
          <td style="padding:10px;text-align:center;background:#0E1118;border-left:1px solid #1C2235;border-top:1px solid #1C2235;border-bottom:1px solid #1C2235;">
            <div style="font-size:10px;font-family:monospace;color:#6B7A99;margin-bottom:4px;">TARGET</div>
            <div style="font-size:15px;font-family:monospace;font-weight:600;color:#00C48C;">
              $${signal.target_price.toLocaleString()}
            </div>
          </td>
          <td style="padding:10px;text-align:center;background:#0E1118;border-radius:0 8px 8px 0;border:1px solid #1C2235;border-left:none;">
            <div style="font-size:10px;font-family:monospace;color:#6B7A99;margin-bottom:4px;">STOP</div>
            <div style="font-size:15px;font-family:monospace;font-weight:600;color:#FF4757;">
              $${signal.stop_loss.toLocaleString()}
            </div>
          </td>
        </tr>
      </table>

      <!-- R:R + reasoning -->
      <div style="margin-bottom:16px;">
        <span style="font-size:12px;font-family:monospace;color:#6B7A99;">
          R:R <span style="color:#00E5FF;">${rr}x</span>
          &nbsp;·&nbsp;
          Model: <span style="color:#6B7A99;">${signal.model_used?.split('/').pop() ?? 'Kimi K2'}</span>
        </span>
      </div>

      <div style="
        background:#0E1118;
        border:1px solid #1C2235;
        border-radius:8px;
        padding:12px 14px;
        font-size:13px;
        color:#6B7A99;
        line-height:1.6;
      ">
        ${signal.reasoning}
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px;border-top:1px solid #1C2235;background:#0E1118;">
      <p style="margin:0;font-size:11px;font-family:monospace;color:#3D4A66;text-align:center;">
        Arbitex · AI Trading · Powered by Kimi K2 &amp; Bitget
        <br>You're receiving this because you enabled signal alerts.
      </p>
    </div>

  </div>
</body>
</html>`
}

function subjectLine(event: AlertEvent, signal: AISignal): string {
  const dir = signal.direction === 'long' ? '↑' : signal.direction === 'short' ? '↓' : '→'
  const map: Record<AlertEvent, string> = {
    signal_generated: `${dir} New ${signal.confidence} confidence signal — ${signal.symbol}`,
    signal_triggered: `⚡ Entry triggered — ${signal.symbol} ${dir}`,
    signal_expired:   `⏱ Signal expired — ${signal.symbol}`,
    stop_hit:         `🛑 Stop hit — ${signal.symbol} ${signal.direction}`,
    target_hit:       `🎯 Target reached — ${signal.symbol} ${signal.direction}`,
  }
  return map[event]
}

// ── Resend email sender ──────────────────────────────────────

export class EmailAlertService {
  private readonly apiKey = process.env.RESEND_API_KEY ?? ''
  private readonly fromAddress = process.env.ALERT_FROM_EMAIL ?? 'alerts@arbitex.io'

  private async send(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) {
      console.warn('RESEND_API_KEY not set — email alert skipped')
      return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        return { success: false, error: `Resend API error ${res.status}: ${err}` }
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async sendSignalAlert(
    to: string,
    signal: AISignal,
    event: AlertEvent
  ): Promise<{ success: boolean; error?: string }> {
    return this.send({
      to,
      subject: subjectLine(event, signal),
      html: signalEmailHtml(signal, event),
    })
  }
}

export const emailAlertService = new EmailAlertService()
