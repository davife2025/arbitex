import { strategyEngine } from './strategy-engine'
import { sleep } from '@arbitex/utils'

const RUN_INTERVAL_MS = 15 * 60 * 1000 // every 15 minutes
let running = false

export async function startStrategyRunner() {
  if (running) return
  running = true
  console.log('🤖 Strategy runner started (15min interval)')

  while (running) {
    try {
      console.log('🤖 Running all enabled strategies...')
      await strategyEngine.runAll()
    } catch (err) {
      console.error('Strategy runner error:', err)
    }
    await sleep(RUN_INTERVAL_MS)
  }
}

export function stopStrategyRunner() { running = false }
