import { vi } from 'vitest'

// Mock environment variables
process.env.BITGET_API_KEY = 'test-api-key'
process.env.BITGET_API_SECRET = 'test-api-secret'
process.env.BITGET_PASSPHRASE = 'test-passphrase'
process.env.BITGET_BASE_URL = 'https://api.bitget.com'
process.env.HUGGINGFACE_API_TOKEN = 'hf_test_token'
process.env.KIMI_MODEL_ID = 'moonshotai/Kimi-K2-Instruct'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.API_PORT = '4000'
process.env.CORS_ORIGIN = 'http://localhost:3000'

// Global fetch mock
global.fetch = vi.fn()
