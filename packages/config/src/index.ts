// ─────────────────────────────────────────
//  ARBITEX — Shared Config
// ─────────────────────────────────────────

export const config = {
  bitget: {
    baseUrl: process.env.BITGET_BASE_URL ?? 'https://api.bitget.com',
    wsUrl: 'wss://ws.bitget.com/v2/ws/public',
    wsPrivateUrl: 'wss://ws.bitget.com/v2/ws/private',
  },
  huggingface: {
    apiUrl: 'https://api-inference.huggingface.co/models',
    modelId: process.env.KIMI_MODEL_ID ?? 'moonshotai/Kimi-K2-Instruct',
  },
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    anonKey: process.env.SUPABASE_ANON_KEY ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  },
  api: {
    port: parseInt(process.env.API_PORT ?? '4000'),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  },
  signals: {
    defaultExpiry: 4 * 60 * 60 * 1000, // 4 hours in ms
    maxActiveSignals: 10,
  },
} as const

export type Config = typeof config
