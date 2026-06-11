import { bitgetService } from './bitget'
import { broadcaster } from './ws-broadcaster'
import { supabaseAdmin } from './supabase'
import { paperTradingEngine } from './paper-trading'
import { watchlistService } from './watchlist'
import { sleep } from '@arbitex/utils'

const POLL_INTERVAL_MS = 5000
const TOP_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']

let polling = false

export async function startMarketPoller() {
  if (polling) return
  polling = true
  console.log('📡 Market poller started')

  while (polling) {
    try {
      const tickers = await Promise.allSettled(
        TOP_SYMBOLS.map((s) => bitgetService.getTicker(s))
      )

      const resolved = tickers
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value)

      if (resolved.length > 0) {
        broadcaster.broadcast('ticker_update', resolved)

        await supabaseAdmin.from('tickers').upsert(
          resolved.map((t) => ({
            symbol: t.symbol,
            last_price: t.last_price,
            bid: t.bid,
            ask: t.ask,
            volume_24h: t.volume_24h,
            change_24h: t.change_24h,
            fetched_at: new Date().toISOString(),
          })),
          { onConflict: 'symbol' }
        )

        // Mark-to-market paper positions + check watchlist price alerts
        for (const ticker of resolved) {
          paperTradingEngine.markToMarket(ticker.symbol, ticker.last_price).catch(() => {})
          watchlistService.checkPriceAlerts(ticker.symbol, ticker.last_price).catch(() => {})
        }
      }
    } catch (err) {
      console.error('Market poller error:', err)
    }

    await sleep(POLL_INTERVAL_MS)
  }
}

export function stopMarketPoller() { polling = false }
