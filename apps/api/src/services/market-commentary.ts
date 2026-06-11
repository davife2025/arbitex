import { supabaseAdmin } from './supabase'
import { bitgetService } from './bitget'
import { config } from '@arbitex/config'

export interface MarketCommentary {
  id: string
  commentary: string
  symbols: string[]
  market_mood: 'bullish' | 'bearish' | 'neutral' | 'mixed'
  key_levels: Record<string, { support: number; resistance: number }>
  generated_at: string
  expires_at: string
}

export class MarketCommentaryService {
  private readonly modelId = config.huggingface.modelId
  private readonly apiUrl = `${config.huggingface.apiUrl}/${this.modelId}/v1/chat/completions`
  private readonly TOP_SYMBOLS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT']
  private readonly TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

  async getLatest(): Promise<MarketCommentary | null> {
    const { data } = await supabaseAdmin
      .from('market_commentary')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    return data as MarketCommentary | null
  }

  async generate(forceRefresh = false): Promise<MarketCommentary> {
    // Return cached if still valid
    if (!forceRefresh) {
      const cached = await this.getLatest()
      if (cached) return cached
    }

    // Fetch live tickers
    const tickerResults = await Promise.allSettled(
      this.TOP_SYMBOLS.map(s => bitgetService.getTicker(s))
    )
    const tickers = tickerResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value)

    // Build context
    const tickerContext = tickers.map(t =>
      `${t.symbol}: $${t.last_price.toLocaleString()} | 24h: ${t.change_24h >= 0 ? '+' : ''}${t.change_24h.toFixed(2)}% | Vol: ${(t.volume_24h / 1e6).toFixed(1)}M`
    ).join('\n')

    const prompt = `You are Arbitex AI, a professional crypto market analyst. 
Analyze the following real-time market data and produce a concise daily market brief.

MARKET DATA (${new Date().toUTCString()}):
${tickerContext}

Respond ONLY with a valid JSON object, no markdown:
{
  "commentary": "3-4 sentences of market analysis. Be specific about price action, momentum, and notable patterns. End with one actionable insight.",
  "market_mood": "bullish" | "bearish" | "neutral" | "mixed",
  "key_levels": {
    "BTCUSDT": { "support": <number>, "resistance": <number> },
    "ETHUSDT": { "support": <number>, "resistance": <number> }
  }
}`

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
        temperature: 0.4,
        stream: false,
      }),
    })

    if (!res.ok) throw new Error(`HuggingFace API error: ${res.status}`)

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content ?? ''
    const cleaned = raw.replace(/```json|```/g, '').trim()

    let parsed: { commentary: string; market_mood: string; key_levels: any }
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // Fallback if Kimi doesn't return JSON
      parsed = {
        commentary: cleaned.slice(0, 500),
        market_mood: 'neutral',
        key_levels: {},
      }
    }

    const expiresAt = new Date(Date.now() + this.TTL_MS).toISOString()

    const { data: saved, error } = await supabaseAdmin
      .from('market_commentary')
      .insert({
        commentary: parsed.commentary,
        symbols: this.TOP_SYMBOLS,
        market_mood: parsed.market_mood ?? 'neutral',
        key_levels: parsed.key_levels ?? {},
        expires_at: expiresAt,
      })
      .select().single()

    if (error) throw new Error(error.message)
    return saved as MarketCommentary
  }
}

export const marketCommentaryService = new MarketCommentaryService()
