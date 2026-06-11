import { performanceTracker } from './performance-tracker'
import { leaderboardService } from './leaderboard'
import { supabaseAdmin } from './supabase'
import { sleep } from '@arbitex/utils'

const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000
let running = false

export async function startSnapshotWorker() {
  if (running) return
  running = true
  console.log('📊 Snapshot worker started (1hr interval)')

  while (running) {
    try {
      // Snapshot all users with paper accounts
      const { data: accounts } = await supabaseAdmin
        .from('paper_accounts')
        .select('user_id')

      for (const account of accounts ?? []) {
        try {
          await performanceTracker.snapshotDay(account.user_id)
          await leaderboardService.snapshotUser(account.user_id)
        } catch (err) {
          console.error(`Snapshot error for ${account.user_id}:`, err)
        }
        await sleep(200)
      }

      console.log(`📊 Snapshots done for ${accounts?.length ?? 0} users`)
    } catch (err) {
      console.error('Snapshot worker error:', err)
    }
    await sleep(SNAPSHOT_INTERVAL_MS)
  }
}

export function stopSnapshotWorker() { running = false }
