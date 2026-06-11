import type { Portfolio } from '@arbitex/types'
import type { ConfluenceResult } from './confluence'

export interface SizingInput {
  confluence: ConfluenceResult
  portfolio: Portfolio
  entry_price: number
  stop_loss: number
  target_price: number
  max_risk_pct?: number      // max % of equity to risk per trade (default 1%)
  max_position_pct?: number  // max % of equity in a single position (default 10%)
}

export interface SizingResult {
  recommended_size: number       // in base currency units
  position_value_usdt: number    // total USDT value
  risk_amount_usdt: number       // max loss if stop hit
  reward_amount_usdt: number     // max gain if target hit
  risk_pct_of_equity: number     // % of total equity at risk
  position_pct_of_equity: number // position size as % of equity
  risk_reward_ratio: number
  kelly_fraction: number         // raw Kelly %
  rationale: string
  warnings: string[]
}

// ── Kelly criterion ──────────────────────────────────────────
// Simplified Kelly: f = (p * b - q) / b
// p = estimated win probability, b = reward/risk ratio, q = 1-p
function kellyFraction(
  winProbability: number,
  rewardRiskRatio: number
): number {
  const p = Math.max(0.01, Math.min(0.99, winProbability))
  const q = 1 - p
  const b = Math.max(0.1, rewardRiskRatio)
  const kelly = (p * b - q) / b
  // Use half-Kelly for safety
  return Math.max(0, kelly * 0.5)
}

// Map confidence + alignment to win probability estimate
function estimateWinProbability(confluence: ConfluenceResult): number {
  const base: Record<string, number> = { high: 0.60, medium: 0.52, low: 0.45 }
  let p = base[confluence.confidence] ?? 0.50

  // Boost for full alignment
  const alignRatio = confluence.aligned_timeframes / confluence.total_timeframes
  p += alignRatio * 0.05

  // Boost for strong composite score
  p += Math.abs(confluence.composite_score) * 0.05

  return Math.min(0.75, p)
}

export class PositionSizer {
  size(input: SizingInput): SizingResult {
    const {
      confluence,
      portfolio,
      entry_price,
      stop_loss,
      target_price,
      max_risk_pct = 0.01,     // 1% of equity max risk
      max_position_pct = 0.10, // 10% of equity max position
    } = input

    const equity = portfolio.total_equity
    const available = portfolio.available_balance
    const warnings: string[] = []

    // Risk per unit
    const risk_per_unit = Math.abs(entry_price - stop_loss)
    const reward_per_unit = Math.abs(target_price - entry_price)

    if (risk_per_unit === 0) {
      return {
        recommended_size: 0,
        position_value_usdt: 0,
        risk_amount_usdt: 0,
        reward_amount_usdt: 0,
        risk_pct_of_equity: 0,
        position_pct_of_equity: 0,
        risk_reward_ratio: 0,
        kelly_fraction: 0,
        rationale: 'Invalid: stop loss equals entry price',
        warnings: ['Stop loss must differ from entry price'],
      }
    }

    const rr = reward_per_unit / risk_per_unit

    // Kelly sizing
    const winProb = estimateWinProbability(confluence)
    const kelly = kellyFraction(winProb, rr)

    // Max risk in USDT
    const max_risk_usdt = equity * max_risk_pct
    const kelly_risk_usdt = equity * kelly

    // Take the minimum of Kelly and max_risk cap
    const risk_amount_usdt = Math.min(kelly_risk_usdt, max_risk_usdt)

    // Size from risk
    let size = risk_amount_usdt / risk_per_unit

    // Cap by max_position_pct
    const max_position_usdt = equity * max_position_pct
    const position_value = size * entry_price
    if (position_value > max_position_usdt) {
      size = max_position_usdt / entry_price
      warnings.push(`Position capped at ${(max_position_pct * 100).toFixed(0)}% of equity`)
    }

    // Cap by available balance
    const available_size = available / entry_price
    if (size > available_size) {
      size = available_size * 0.95 // leave 5% buffer
      warnings.push('Position reduced to available balance')
    }

    // Low confidence warning
    if (confluence.confidence === 'low') {
      size *= 0.5
      warnings.push('Size halved due to low confidence signal')
    }

    // Neutral direction warning
    if (confluence.direction === 'neutral') {
      size = 0
      warnings.push('No position recommended — market is neutral across timeframes')
    }

    const final_position_value = size * entry_price
    const final_risk = size * risk_per_unit
    const final_reward = size * reward_per_unit

    const rationale = [
      `Win probability: ${(winProb * 100).toFixed(1)}%`,
      `Kelly fraction: ${(kelly * 100).toFixed(2)}% (half-Kelly applied)`,
      `R:R ratio: ${rr.toFixed(2)}`,
      `Timeframe alignment: ${confluence.aligned_timeframes}/${confluence.total_timeframes}`,
      `Composite score: ${confluence.composite_score.toFixed(3)}`,
    ].join(' · ')

    return {
      recommended_size: parseFloat(size.toFixed(6)),
      position_value_usdt: parseFloat(final_position_value.toFixed(2)),
      risk_amount_usdt: parseFloat(final_risk.toFixed(2)),
      reward_amount_usdt: parseFloat(final_reward.toFixed(2)),
      risk_pct_of_equity: parseFloat(((final_risk / equity) * 100).toFixed(3)),
      position_pct_of_equity: parseFloat(((final_position_value / equity) * 100).toFixed(2)),
      risk_reward_ratio: parseFloat(rr.toFixed(3)),
      kelly_fraction: parseFloat((kelly * 100).toFixed(3)),
      rationale,
      warnings,
    }
  }
}

export const positionSizer = new PositionSizer()
