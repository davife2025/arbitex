import { config } from '@arbitex/config'
import type { AISignal, Ticker, Candle, SignalDirection, SignalConfidence } from '@arbitex/types'

export interface SignalGenerationInput {
  symbol: string
  ticker: Ticker
  candles: Candle[]
  portfolio_context?: string
}

interface HFMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface HFChatResponse {
  choices: Array<{
    message: { role: string; content: string }
    finish_reason: string
  }>
  usage?: { prompt_tokens: number; completion_tokens: number }
}

// Raw signal shape returned by Kimi
interface RawSignal {
  symbol: string
  direction: SignalDirection
  confidence: SignalConfidence
  entry_price: number
  target_price: number
  stop_loss: number
  reasoning: string
  risk_reward_ratio: number
  key_levels: number[]
  indicators: {
    trend: string
    momentum: string
    volume: string
  }
}

export class KimiService {
  private readonly apiToken = process.env.HUGGINGFACE_API_TOKEN!
  private readonly modelId = config.huggingface.modelId
  private readonly apiUrl = `${config.huggingface.apiUrl}/${this.modelId}/v1/chat/completions`

  // ── Core chat completion ─────────────────────────────────────
  private async chat(messages: HFMessage[], maxTokens = 1024): Promise<string> {
    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        max_tokens: maxTokens,
        temperature: 0.3,       // low temp for consistent structured output
        top_p: 0.9,
        stream: false,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`HuggingFace API error ${res.status}: ${err}`)
    }

    const data: HFChatResponse = await res.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) throw new Error('Empty response from Kimi K2')
    return content
  }

  // ── Technical indicator calculations ────────────────────────
  private calcSMA(candles: Candle[], period: number): number {
    const slice = candles.slice(-period)
    return slice.reduce((sum, c) => sum + c.close, 0) / slice.length
  }

  private calcEMA(candles: Candle[], period: number): number {
    const k = 2 / (period + 1)
    let ema = candles[0].close
    for (const c of candles) {
      ema = c.close * k + ema * (1 - k)
    }
    return ema
  }

  private calcRSI(candles: Candle[], period = 14): number {
    const closes = candles.slice(-period - 1).map((c) => c.close)
    let gains = 0, losses = 0

    for (let i = 1; i < closes.length; i++) {
      const delta = closes[i] - closes[i - 1]
      if (delta > 0) gains += delta
      else losses -= delta
    }

    const avgGain = gains / period
    const avgLoss = losses / period
    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - 100 / (1 + rs)
  }

  private calcATR(candles: Candle[], period = 14): number {
    const trs = candles.slice(-period).map((c, i, arr) => {
      if (i === 0) return c.high - c.low
      const prev = arr[i - 1].close
      return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev))
    })
    return trs.reduce((sum, tr) => sum + tr, 0) / trs.length
  }

  private calcVolumeProfile(candles: Candle[]): { avg: number; current: number; ratio: number } {
    const recent = candles.slice(-20)
    const avg = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length
    const current = candles[candles.length - 1]?.volume ?? 0
    return { avg, current, ratio: avg > 0 ? current / avg : 1 }
  }

  private buildMarketContext(input: SignalGenerationInput): string {
    const { symbol, ticker, candles } = input
    if (candles.length < 20) throw new Error('Insufficient candle data — need at least 20 candles')

    const sma20 = this.calcSMA(candles, 20)
    const sma50 = candles.length >= 50 ? this.calcSMA(candles, 50) : null
    const ema9 = this.calcEMA(candles, 9)
    const rsi = this.calcRSI(candles)
    const atr = this.calcATR(candles)
    const volume = this.calcVolumeProfile(candles)
    const last = candles[candles.length - 1]
    const prev = candles[candles.length - 2]
    const priceChange = ((last.close - prev.close) / prev.close) * 100

    return `
SYMBOL: ${symbol}
CURRENT PRICE: ${ticker.last_price}
BID/ASK: ${ticker.bid} / ${ticker.ask}
24H CHANGE: ${ticker.change_24h.toFixed(2)}%
24H VOLUME: ${ticker.volume_24h.toFixed(2)}

TECHNICAL INDICATORS (based on ${candles.length} candles, interval: ${candles[0]?.interval ?? 'unknown'}):
- EMA(9): ${ema9.toFixed(4)}
- SMA(20): ${sma20.toFixed(4)}
${sma50 ? `- SMA(50): ${sma50.toFixed(4)}` : ''}
- RSI(14): ${rsi.toFixed(2)}
- ATR(14): ${atr.toFixed(4)}
- Price vs SMA20: ${ticker.last_price > sma20 ? 'ABOVE' : 'BELOW'} (${(((ticker.last_price - sma20) / sma20) * 100).toFixed(2)}%)
${sma50 ? `- Price vs SMA50: ${ticker.last_price > sma50 ? 'ABOVE' : 'BELOW'}` : ''}
- EMA9 vs SMA20: ${ema9 > sma20 ? 'BULLISH crossover' : 'BEARISH crossover'}

LATEST CANDLE:
- Open: ${last.open} | High: ${last.high} | Low: ${last.low} | Close: ${last.close}
- Candle body: ${((Math.abs(last.close - last.open) / last.open) * 100).toFixed(2)}%
- Price change from prev candle: ${priceChange.toFixed(2)}%

VOLUME:
- Current volume: ${volume.current.toFixed(2)}
- 20-period avg volume: ${volume.avg.toFixed(2)}
- Volume ratio: ${volume.ratio.toFixed(2)}x (${volume.ratio > 1.5 ? 'HIGH' : volume.ratio < 0.7 ? 'LOW' : 'NORMAL'})

${input.portfolio_context ? `PORTFOLIO CONTEXT:\n${input.portfolio_context}` : ''}
`.trim()
  }

  // ── Signal Generation ────────────────────────────────────────
  async generateSignal(
    input: SignalGenerationInput
  ): Promise<Omit<AISignal, 'id' | 'user_id' | 'created_at'>> {
    const marketContext = this.buildMarketContext(input)

    const messages: HFMessage[] = [
      {
        role: 'system',
        content: `You are Arbitex AI, an expert quantitative trading analyst specializing in crypto markets.
Your job is to analyze market data and generate precise, actionable trading signals.

You MUST respond ONLY with a valid JSON object — no markdown, no explanation, no preamble.
The JSON must follow this exact schema:
{
  "symbol": string,
  "direction": "long" | "short" | "neutral",
  "confidence": "low" | "medium" | "high",
  "entry_price": number,
  "target_price": number,
  "stop_loss": number,
  "reasoning": string (2-3 sentences max, technical focus),
  "risk_reward_ratio": number,
  "key_levels": number[] (2-4 key price levels),
  "indicators": {
    "trend": "bullish" | "bearish" | "neutral",
    "momentum": "strong" | "moderate" | "weak",
    "volume": "high" | "normal" | "low"
  }
}

Rules:
- entry_price must be within 0.5% of current price
- target_price must give at least 1.5:1 reward-to-risk ratio
- stop_loss must be beyond a meaningful support/resistance level
- If RSI > 75 and trend is up, bias SHORT or NEUTRAL
- If RSI < 25 and trend is down, bias LONG or NEUTRAL
- Never recommend a signal without edge`,
      },
      {
        role: 'user',
        content: `Analyze the following market data and generate a trading signal:\n\n${marketContext}`,
      },
    ]

    const raw = await this.chat(messages, 1024)

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/g, '').trim()
    let parsed: RawSignal

    try {
      parsed = JSON.parse(cleaned)
    } catch {
      throw new Error(`Kimi K2 returned invalid JSON: ${cleaned.slice(0, 200)}`)
    }

    // Validate required fields
    const required: (keyof RawSignal)[] = [
      'symbol', 'direction', 'confidence', 'entry_price',
      'target_price', 'stop_loss', 'reasoning',
    ]
    for (const field of required) {
      if (parsed[field] === undefined || parsed[field] === null) {
        throw new Error(`Missing field in signal: ${field}`)
      }
    }

    const expiresAt = new Date(Date.now() + config.signals.defaultExpiry).toISOString()

    return {
      symbol: parsed.symbol,
      direction: parsed.direction,
      confidence: parsed.confidence,
      entry_price: parsed.entry_price,
      target_price: parsed.target_price,
      stop_loss: parsed.stop_loss,
      reasoning: parsed.reasoning,
      model_used: this.modelId,
      status: 'active',
      expires_at: expiresAt,
    }
  }

  // ── Market Overview ──────────────────────────────────────────
  async analyzeMarket(
    symbols: string[],
    tickers: Ticker[]
  ): Promise<string> {
    const tickerSummary = tickers
      .filter((t) => symbols.includes(t.symbol))
      .map(
        (t) =>
          `${t.symbol}: $${t.last_price} (${t.change_24h >= 0 ? '+' : ''}${t.change_24h.toFixed(2)}% 24h, vol: ${t.volume_24h.toFixed(0)})`
      )
      .join('\n')

    const messages: HFMessage[] = [
      {
        role: 'system',
        content: `You are Arbitex AI, a crypto market analyst. 
Provide a concise (3-5 sentence) market overview based on the ticker data provided.
Focus on: overall market sentiment, notable movers, volume trends, and one actionable insight.
Respond in plain text — no markdown headers, no bullet points.`,
      },
      {
        role: 'user',
        content: `Current market snapshot:\n${tickerSummary}\n\nProvide a brief market overview.`,
      },
    ]

    return this.chat(messages, 512)
  }
}

export const kimiService = new KimiService()
