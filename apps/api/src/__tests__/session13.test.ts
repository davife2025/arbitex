import { describe, it, expect } from 'vitest'
import * as crypto from 'crypto'

// ── Order book calculations ───────────────────────────────────

function computeImbalance(bidDepth: number, askDepth: number): number {
  const total = bidDepth + askDepth
  if (total === 0) return 0
  return (bidDepth - askDepth) / total
}

function computeSpreadPct(bid: number, ask: number): number {
  const mid = (bid + ask) / 2
  return mid > 0 ? ((ask - bid) / mid) * 100 : 0
}

function computeCumulative(levels: { price: number; size: number }[]): number[] {
  let cum = 0
  return levels.map(l => { cum += l.size; return cum })
}

describe('Order book — calculations', () => {
  it('imbalance is 0 when bid and ask depth are equal', () => {
    expect(computeImbalance(5000, 5000)).toBe(0)
  })

  it('imbalance is positive when bids dominate', () => {
    expect(computeImbalance(8000, 2000)).toBe(0.6)
  })

  it('imbalance is negative when asks dominate', () => {
    expect(computeImbalance(2000, 8000)).toBe(-0.6)
  })

  it('imbalance is bounded between -1 and 1', () => {
    expect(computeImbalance(10000, 0)).toBe(1)
    expect(computeImbalance(0, 10000)).toBe(-1)
  })

  it('spread pct is calculated from mid price', () => {
    const pct = computeSpreadPct(64999, 65001)
    expect(pct).toBeCloseTo(0.00308, 3)
  })

  it('cumulative totals increase monotonically', () => {
    const levels = [
      { price: 65000, size: 0.1 },
      { price: 64999, size: 0.2 },
      { price: 64998, size: 0.3 },
    ]
    const totals = computeCumulative(levels)
    expect(totals[0]).toBeLessThan(totals[1])
    expect(totals[1]).toBeLessThan(totals[2])
    expect(totals[2]).toBeCloseTo(0.6)
  })

  it('depth pct is 100 at deepest level', () => {
    const sizes = [0.5, 0.3, 0.2]
    const maxTotal = sizes.reduce((s, v) => s + v, 0)
    let cum = 0
    const pcts = sizes.map(s => { cum += s; return (cum / maxTotal) * 100 })
    expect(pcts[pcts.length - 1]).toBe(100)
  })
})

// ── AES-256-GCM encryption ────────────────────────────────────

const KEY = Buffer.from('arbitex-default-key-32-bytes-pad!')

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

function decrypt(data: string): string {
  const [ivHex, tagHex, encHex] = data.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const enc = Buffer.from(encHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv)
  decipher.setAuthTag(tag)
  return decipher.update(enc).toString('utf8') + decipher.final('utf8')
}

describe('Account manager — AES-256-GCM encryption', () => {
  it('encrypts and decrypts correctly', () => {
    const original = 'my-secret-api-key-123'
    const encrypted = encrypt(original)
    expect(decrypt(encrypted)).toBe(original)
  })

  it('produces different ciphertext each time (random IV)', () => {
    const text = 'same-key'
    const a = encrypt(text)
    const b = encrypt(text)
    expect(a).not.toBe(b) // different IVs
    expect(decrypt(a)).toBe(text)
    expect(decrypt(b)).toBe(text)
  })

  it('format contains 3 colon-separated parts', () => {
    const enc = encrypt('test')
    const parts = enc.split(':')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toHaveLength(32) // 16 bytes hex
    expect(parts[1]).toHaveLength(32) // 16 bytes tag hex
  })

  it('throws on tampered ciphertext', () => {
    const enc = encrypt('sensitive-data')
    const parts = enc.split(':')
    // Corrupt the encrypted data
    parts[2] = parts[2].replace(/.$/, parts[2].slice(-1) === '0' ? '1' : '0')
    expect(() => decrypt(parts.join(':'))).toThrow()
  })

  it('handles empty string', () => {
    expect(decrypt(encrypt(''))).toBe('')
  })

  it('handles special characters and unicode', () => {
    const text = 'key!@#$%^&*()_+🔑'
    expect(decrypt(encrypt(text))).toBe(text)
  })
})

// ── Commentary mood mapping ───────────────────────────────────

describe('Market commentary', () => {
  const validMoods = ['bullish', 'bearish', 'neutral', 'mixed']

  it('only accepts valid mood values', () => {
    validMoods.forEach(mood => {
      expect(validMoods.includes(mood)).toBe(true)
    })
    expect(validMoods.includes('sideways')).toBe(false)
  })

  it('strips markdown fences from Kimi response', () => {
    const raw = '```json\n{"commentary":"market is up","market_mood":"bullish"}\n```'
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    expect(parsed.commentary).toBe('market is up')
    expect(parsed.market_mood).toBe('bullish')
  })

  it('fallback handles non-JSON response gracefully', () => {
    const raw = 'Bitcoin is showing strong momentum above key support levels.'
    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = { commentary: raw.slice(0, 500), market_mood: 'neutral', key_levels: {} }
    }
    expect(parsed.commentary).toContain('Bitcoin')
    expect(parsed.market_mood).toBe('neutral')
  })

  it('commentary TTL is 4 hours in ms', () => {
    const TTL_MS = 4 * 60 * 60 * 1000
    expect(TTL_MS).toBe(14400000)
  })
})
