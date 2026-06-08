// ─────────────────────────────────────────
//  ARBITEX — Shared Utilities
// ─────────────────────────────────────────

export const formatPrice = (price: number, decimals = 2): string =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price)

export const formatPnl = (pnl: number): string => {
  const sign = pnl >= 0 ? '+' : ''
  return `${sign}${formatPrice(pnl)}`
}

export const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const retry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  try {
    return await fn()
  } catch (err) {
    if (retries <= 0) throw err
    await sleep(delay)
    return retry(fn, retries - 1, delay * 2)
  }
}

export const safeJsonParse = <T>(str: string): T | null => {
  try {
    return JSON.parse(str) as T
  } catch {
    return null
  }
}

export const timestamp = (): number => Date.now()

export const toISOString = (ts: number): string =>
  new Date(ts).toISOString()
