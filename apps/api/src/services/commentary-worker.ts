import { marketCommentaryService } from './market-commentary'
import { broadcaster } from './ws-broadcaster'
import { sleep } from '@arbitex/utils'

const INTERVAL_MS = 4 * 60 * 60 * 1000 // every 4 hours
let running = false

export async function startCommentaryWorker() {
  if (running) return
  running = true
  console.log('📰 Commentary worker started (4hr interval)')

  // Generate on startup if no cached version
  try {
    const existing = await marketCommentaryService.getLatest()
    if (!existing) {
      const commentary = await marketCommentaryService.generate()
      broadcaster.broadcast('signal_update', { type: 'commentary', data: commentary })
      console.log('📰 Initial market commentary generated')
    }
  } catch (err) {
    console.error('Commentary startup error:', err)
  }

  while (running) {
    await sleep(INTERVAL_MS)
    try {
      const commentary = await marketCommentaryService.generate(true)
      broadcaster.broadcast('signal_update', { type: 'commentary', data: commentary })
      console.log('📰 Market commentary refreshed')
    } catch (err) {
      console.error('Commentary worker error:', err)
    }
  }
}

export function stopCommentaryWorker() { running = false }
