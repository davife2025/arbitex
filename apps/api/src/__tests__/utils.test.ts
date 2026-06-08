import { describe, it, expect, vi } from 'vitest'
import { formatPrice, formatPnl, formatPercent, sleep, retry, safeJsonParse } from '@arbitex/utils'

describe('formatPrice', () => {
  it('formats to 2 decimal places by default', () => {
    expect(formatPrice(65432.1)).toBe('65,432.10')
  })

  it('formats to custom decimal places', () => {
    expect(formatPrice(0.12345678, 8)).toBe('0.12345678')
  })

  it('uses thousands separator', () => {
    expect(formatPrice(1000000)).toBe('1,000,000.00')
  })

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('0.00')
  })
})

describe('formatPnl', () => {
  it('prefixes positive with +', () => {
    expect(formatPnl(1234.56)).toBe('+1,234.56')
  })

  it('no prefix for negative (already has -)', () => {
    expect(formatPnl(-500)).toBe('-500.00')
  })

  it('prefixes zero with +', () => {
    expect(formatPnl(0)).toBe('+0.00')
  })
})

describe('formatPercent', () => {
  it('prefixes positive with +', () => {
    expect(formatPercent(3.12)).toBe('+3.12%')
  })

  it('negative has no extra prefix', () => {
    expect(formatPercent(-1.5)).toBe('-1.50%')
  })

  it('formats to 2 decimal places', () => {
    expect(formatPercent(0.1)).toBe('+0.10%')
  })
})

describe('sleep', () => {
  it('resolves after the given ms', async () => {
    const start = Date.now()
    await sleep(50)
    expect(Date.now() - start).toBeGreaterThanOrEqual(45)
  })
})

describe('retry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await retry(fn, 3, 0)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and eventually succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success')
    const result = await retry(fn, 3, 0)
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    await expect(retry(fn, 2, 0)).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
  })
})

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse<{ a: number }>('{"a":1}')).toEqual({ a: 1 })
  })

  it('returns null on invalid JSON', () => {
    expect(safeJsonParse('not json')).toBeNull()
  })

  it('returns null on empty string', () => {
    expect(safeJsonParse('')).toBeNull()
  })
})
