// TODO Session 3: Full Kimi K2 integration via HuggingFace Inference
import { config } from '@arbitex/config'
import type { AISignal, Ticker, Candle } from '@arbitex/types'

export interface SignalGenerationInput {
  symbol: string
  ticker: Ticker
  candles: Candle[]
  portfolio_context?: string
}

export class KimiService {
  private readonly apiToken = process.env.HUGGINGFACE_API_TOKEN!
  private readonly modelId = config.huggingface.modelId
  private readonly apiUrl = `${config.huggingface.apiUrl}/${this.modelId}/v1/chat/completions`

  private buildPrompt(input: SignalGenerationInput): string {
    // TODO Session 3: structured market analysis prompt
    return `Analyze ${input.symbol} and provide a trading signal in JSON format.`
  }

  async generateSignal(input: SignalGenerationInput): Promise<Omit<AISignal, 'id' | 'user_id' | 'created_at'>> {
    // TODO Session 3: full implementation
    void input
    throw new Error('Not implemented — Session 3')
  }

  async analyzeMarket(symbols: string[]): Promise<string> {
    // TODO Session 3: broad market overview
    void symbols
    throw new Error('Not implemented — Session 3')
  }
}

export const kimiService = new KimiService()
