import { supabaseAdmin } from './supabase'
import { broadcaster } from './ws-broadcaster'
import { performanceTracker } from './performance-tracker'
import { alertDispatcher } from './alert-dispatcher'
import { sleep } from '@arbitex/utils'

const CHECK_INTERVAL_MS = 60 * 1000
let running = false

export async function startSignalExpiryWorker() {
  if (running) return
  running = true
  console.log('⏱️  Signal expiry worker started')

  while (running) {
    try {
      const { data: expired, error } = await supabaseAdmin
        .from('ai_signals')
        .update({ status: 'expired' })
        .eq('status', 'active')
        .lt('expires_at', new Date().toISOString())
        .select()

      if (!error && expired && expired.length > 0) {
        console.log(`⏱️  Expired ${expired.length} signal(s)`)

        for (const signal of expired) {
          broadcaster.broadcast('signal_update', signal)

          // Record outcome as expired (exit at entry price — no fill)
          performanceTracker
            .recordOutcome(signal as any, 'expired', signal.entry_price)
            .catch(err => console.error('recordOutcome error:', err))

          // Send expiry alerts
          alertDispatcher
            .dispatchSignalAlert(signal as any, 'signal_expired')
            .catch(() => {})
        }
      }
    } catch (err) {
      console.error('Signal expiry worker error:', err)
    }

    await sleep(CHECK_INTERVAL_MS)
  }
}

export function stopSignalExpiryWorker() { running = false }
