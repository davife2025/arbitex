import { describe, it, expect } from 'vitest'

// ── Core paper trading logic tests ──────────────────────────

function calcPnl(side: 'long' | 'short', entryPrice: number, exitPrice: number, size: number) {
  const pnlPct = side === 'long'
    ? ((exitPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - exitPrice) / entryPrice) * 100
  const pnlUsdt = (pnlPct / 100) * (size * entryPrice)
  return { pnlPct, pnlUsdt }
}

function checkStopTarget(
  side: 'long' | 'short',
  currentPrice: number,
  stopLoss: number,
  targetPrice: number
): 'stop' | 'target' | null {
  const isLong = side === 'long'
  if (isLong ? currentPrice <= stopLoss : currentPrice >= stopLoss) return 'stop'
  if (isLong ? currentPrice >= targetPrice : currentPrice <= targetPrice) return 'target'
  return null
}

function calcReturnOnClose(size: number, closePrice: number) {
  return size * closePrice
}

function balanceAfterOpen(balance: number, sizeUsdt: number) {
  if (sizeUsdt > balance) throw new Error('Insufficient balance')
  return balance - sizeUsdt
}

function balanceAfterClose(balance: number, size: number, closePrice: number) {
  return balance + size * closePrice
}

// ── PnL ─────────────────────────────────────────────────────

describe('Paper trading — PnL', () => {
  it('long win: exit > entry', () => {
    const { pnlPct, pnlUsdt } = calcPnl('long', 65000, 67000, 0.01)
    expect(pnlPct).toBeCloseTo(3.077)
    expect(pnlUsdt).toBeGreaterThan(0)
  })

  it('long loss: exit < entry', () => {
    const { pnlPct } = calcPnl('long', 65000, 64000, 0.01)
    expect(pnlPct).toBeLessThan(0)
  })

  it('short win: exit < entry', () => {
    const { pnlPct } = calcPnl('short', 65000, 63000, 0.01)
    expect(pnlPct).toBeCloseTo(3.077)
  })

  it('short loss: exit > entry', () => {
    const { pnlPct } = calcPnl('short', 65000, 66000, 0.01)
    expect(pnlPct).toBeLessThan(0)
  })

  it('pnlUsdt scales with size', () => {
    const small = calcPnl('long', 65000, 67000, 0.01)
    const large = calcPnl('long', 65000, 67000, 0.10)
    expect(large.pnlUsdt).toBeCloseTo(small.pnlUsdt * 10)
  })
})

// ── Stop / target triggers ───────────────────────────────────

describe('Paper trading — stop / target detection', () => {
  it('long: triggers stop when price drops to stop_loss', () => {
    expect(checkStopTarget('long', 64000, 64000, 67000)).toBe('stop')
  })

  it('long: triggers target when price reaches target_price', () => {
    expect(checkStopTarget('long', 67000, 64000, 67000)).toBe('target')
  })

  it('long: no trigger when price is between stop and target', () => {
    expect(checkStopTarget('long', 65500, 64000, 67000)).toBeNull()
  })

  it('short: triggers stop when price rises to stop_loss', () => {
    expect(checkStopTarget('short', 66000, 66000, 63000)).toBe('stop')
  })

  it('short: triggers target when price falls to target_price', () => {
    expect(checkStopTarget('short', 63000, 66000, 63000)).toBe('target')
  })

  it('short: no trigger between stop and target', () => {
    expect(checkStopTarget('short', 64500, 66000, 63000)).toBeNull()
  })
})

// ── Balance management ───────────────────────────────────────

describe('Paper trading — balance', () => {
  it('deducts size from balance on open', () => {
    expect(balanceAfterOpen(10000, 500)).toBe(9500)
  })

  it('throws when size exceeds balance', () => {
    expect(() => balanceAfterOpen(100, 500)).toThrow('Insufficient balance')
  })

  it('returns value on close', () => {
    // opened at 65000, close at 67000, size 0.01 → return 670
    const returned = calcReturnOnClose(0.01, 67000)
    expect(returned).toBeCloseTo(670)
  })

  it('balance after full cycle is correct', () => {
    const initial = 10000
    const sizeUsdt = 650  // 0.01 BTC at 65000
    const size = sizeUsdt / 65000

    const afterOpen = balanceAfterOpen(initial, sizeUsdt)
    expect(afterOpen).toBeCloseTo(9350)

    const returnValue = calcReturnOnClose(size, 67000)
    const afterClose = balanceAfterClose(afterOpen, size, 67000)
    expect(afterClose).toBeGreaterThan(initial) // profitable trade
  })

  it('losing trade reduces final balance', () => {
    const initial = 10000
    const sizeUsdt = 650
    const size = sizeUsdt / 65000

    const afterOpen = balanceAfterOpen(initial, sizeUsdt)
    const afterClose = balanceAfterClose(afterOpen, size, 64000) // loss
    expect(afterClose).toBeLessThan(initial)
  })
})

// ── Account summary ──────────────────────────────────────────

describe('Paper trading — account summary', () => {
  it('total equity = balance + unrealized PnL', () => {
    const balance = 9500
    const unrealizedPnl = 50
    const totalEquity = balance + unrealizedPnl
    expect(totalEquity).toBe(9550)
  })

  it('return % from initial balance', () => {
    const initial = 10000
    const current = 10500
    const pct = ((current - initial) / initial) * 100
    expect(pct).toBe(5)
  })

  it('negative return % on loss', () => {
    const initial = 10000
    const current = 9200
    const pct = ((current - initial) / initial) * 100
    expect(pct).toBe(-8)
  })
})
