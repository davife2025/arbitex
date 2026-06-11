# Arbitex

> AI-powered trading infrastructure for the Bitget AI Challenge  
> Built with Next.js · Fastify · Supabase · Kimi K2 (HuggingFace)

---

## Monorepo Structure

```
arbitex/
├── apps/
│   ├── web/                        # Next.js 14 frontend
│   │   ├── src/app/                # App router pages
│   │   │   ├── (dashboard)/        # Protected dashboard routes
│   │   │   ├── auth/               # Login / signup / callback
│   │   │   ├── error.tsx           # Global error page
│   │   │   ├── not-found.tsx       # 404 page
│   │   │   └── loading.tsx         # Global loading state
│   │   ├── src/components/
│   │   │   ├── ui/                 # Badge, Button, Input, Stat, Skeleton, Toast
│   │   │   ├── charts/             # CandleChart, PortfolioChart
│   │   │   ├── trading/            # SignalCard, OrderPanel, TickerBar, PositionsTable
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── providers.tsx
│   │   ├── src/hooks/              # useMarket, usePortfolio, useSignals, useWebSocket
│   │   ├── src/store/              # Zustand — market, portfolio, signals
│   │   ├── src/lib/                # api.ts, supabase.ts, supabase-server.ts
│   │   └── src/middleware.ts       # Route protection
│   │
│   └── api/                        # Fastify backend
│       ├── src/routes/             # health, market, portfolio, signals, orders
│       ├── src/services/           # bitget, kimi, supabase, market-poller, signal-expiry, ws-broadcaster
│       ├── src/plugins/            # ws, rate-limiter, error-handler
│       └── src/middleware/         # auth
│
├── packages/
│   ├── types/                      # Shared TypeScript types
│   ├── config/                     # Centralized configuration
│   └── utils/                      # formatPrice, retry, sleep, etc.
│
├── supabase/
│   └── schema.sql                  # Full DB schema with RLS policies
│
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── .env.example
└── .env.production.example
```

---

## Tech Stack

| Layer       | Technology                                          |
|-------------|-----------------------------------------------------|
| Frontend    | Next.js 14, Tailwind CSS, Zustand, Recharts         |
| Backend     | Fastify 4, WebSocket, pino logger                   |
| Database    | Supabase (PostgreSQL + Auth + Realtime + RLS)       |
| Trading     | Bitget REST API v2 + WebSocket, HMAC-SHA256 signing |
| AI          | Kimi K2 (moonshotai/Kimi-K2-Instruct) via HuggingFace Inference |
| Monorepo    | Turborepo + pnpm workspaces                         |
| Deploy      | Vercel (web) + Railway (api) + Docker               |

---

## Build Sessions

| Session | Scope                                           | Status   |
|---------|-------------------------------------------------|----------|
| 1       | Architecture, scaffold, schema, stubs           | ✅ Done  |
| 2       | Bitget integration, live data, WebSocket        | ✅ Done  |
| 3       | Kimi K2 AI signal generation                    | ✅ Done  |
| 4       | Dashboard UI, auth, trade execution             | ✅ Done  |
| 5       | Polish, error handling, rate limiting, deploy   | ✅ Done  |

---

## Getting Started

### 1. Install dependencies
```bash
pnpm install
```

### 2. Environment variables
```bash
cp .env.example .env
# Fill in Supabase, Bitget, and HuggingFace credentials
```

### 3. Supabase schema
```bash
# Paste supabase/schema.sql into your Supabase SQL editor and run it
```

### 4. Start development
```bash
pnpm dev
# Web  → http://localhost:3000
# API  → http://localhost:4000
# WS   → ws://localhost:4000/ws
```

---

## API Reference

| Method | Endpoint                         | Description                      |
|--------|----------------------------------|----------------------------------|
| GET    | /health                          | Health check                     |
| GET    | /api/market/tickers              | All cached tickers                |
| GET    | /api/market/ticker/:symbol       | Live ticker (Bitget)             |
| GET    | /api/market/candles/:symbol      | OHLCV candles                    |
| GET    | /api/market/symbols              | All trading pairs                |
| GET    | /api/portfolio                   | Full portfolio snapshot          |
| GET    | /api/portfolio/positions         | Open positions                   |
| GET    | /api/portfolio/balance           | Asset balances                   |
| GET    | /api/orders                      | Order history                    |
| POST   | /api/orders                      | Place order                      |
| DELETE | /api/orders/:id                  | Cancel order                     |
| GET    | /api/signals                     | Active AI signals                |
| GET    | /api/signals/:id                 | Single signal                    |
| POST   | /api/signals/generate            | Generate signal (Kimi K2)        |
| POST   | /api/signals/generate-batch      | Batch scan up to 5 symbols       |
| GET    | /api/signals/market-overview     | AI market narrative              |
| PATCH  | /api/signals/:id/status          | Update signal status             |

---

## Deployment

### Web — Vercel
```bash
# Import the repo to Vercel
# Set root directory: apps/web
# Add all NEXT_PUBLIC_* env vars in Vercel dashboard
```

### API — Railway
```bash
# Create new Railway project
# Connect repo, set Dockerfile path: apps/api/Dockerfile
# Add all env vars in Railway dashboard
# Railway auto-deploys on push to main
```

### Docker (self-hosted)
```bash
cp .env.example .env   # fill in values
docker compose up -d
```

---

## Key Environment Variables

```env
# Bitget
BITGET_API_KEY=
BITGET_API_SECRET=
BITGET_PASSPHRASE=

# Kimi K2 via HuggingFace
HUGGINGFACE_API_TOKEN=
KIMI_MODEL_ID=moonshotai/Kimi-K2-Instruct

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

*Built for the Bitget AI Challenge — Arbitex*

---

## Testing

### Unit Tests (Vitest)

```bash
# Run all unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

**API test suites:**
- `bitget.test.ts` — HMAC signing, ticker/candle/balance parsing
- `kimi.test.ts` — SMA, EMA, RSI, ATR calculations + signal JSON validation
- `utils.test.ts` — formatPrice, formatPnl, retry, safeJsonParse, sleep
- `ws-broadcaster.test.ts` — registration, broadcasting, error removal
- `routes.test.ts` — Fastify route integration (health, market)

**Web test suites:**
- `components.test.tsx` — Badge, Button, Stat, Input
- `stores.test.ts` — MarketStore, PortfolioStore, SignalsStore

### E2E Tests (Playwright)

```bash
cd e2e

# Run all E2E tests (requires running dev server)
pnpm test

# Run with UI
pnpm test:ui

# API tests only (no browser needed)
pnpm test:api

# View last report
pnpm report
```

**E2E suites:**
- `auth.spec.ts` — login page, redirect, form toggle
- `dashboard.spec.ts` — landing page, 404, UI smoke tests
- `api.spec.ts` — health check, structured errors, rate limits, validation

### CI/CD

GitHub Actions runs on every push to `main` and `develop`:
1. Unit tests + type check
2. Build verification
3. E2E tests against deployed preview URLs

```
.github/workflows/ci.yml
```

---

## Session 7 — Advanced AI

### Multi-Timeframe Confluence
`apps/api/src/services/confluence.ts`

Analyzes 1h (25%), 4h (40%), 1d (35%) weighted timeframes. Each TF scored via EMA cross, SMA trend, RSI momentum, and volume confirmation. Composite score ranges from -1 (strong bear) to +1 (strong bull). Confidence determined by alignment ratio and score magnitude.

### Position Sizing (Kelly Criterion)
`apps/api/src/services/position-sizer.ts`

Half-Kelly sizing based on estimated win probability (from confluence confidence + alignment) and R:R ratio. Capped by:
- Max risk per trade (default 1% of equity)
- Max position size (default 10% of equity)
- Available balance
- Confidence penalty (low confidence → 50% size reduction)

### Signal Backtesting
`apps/api/src/services/backtester.ts`

Simulates stored signals against historical candles from Supabase. Reports: win rate, profit factor, Sharpe ratio, max drawdown, avg win/loss, full trade log with entry/exit/bars held.

### New API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/signals/advanced | Confluence + Kimi K2 + Kelly sizing |
| GET  | /api/signals/confluence/:symbol | Multi-TF confluence only |
| POST | /api/signals/size | Position sizing for custom levels |
| GET  | /api/signals/backtest/:symbol | Backtest stored signals |
| GET  | /api/signals/backtest-summary | Backtest all top 5 symbols |

---

## Session 8 — Alerts

### Email Alerts (Resend)
HTML email templates styled to match the Arbitex dark theme. Sent via the Resend REST API — no SMTP setup needed. Each email includes: symbol, direction badge, confidence badge, entry/target/stop price table, R:R ratio, and AI reasoning.

### Telegram Alerts (Bot API)
Markdown-formatted messages sent via Telegram Bot API. Supports signal alerts and position alerts (stop hit / target reached). Includes `/test` endpoint to verify bot connection before going live.

### Alert Events
| Event | Description |
|---|---|
| `signal_generated` | New AI signal created |
| `signal_triggered` | Signal entry price hit |
| `signal_expired` | Signal TTL elapsed without trigger |
| `stop_hit` | Position stopped out |
| `target_hit` | Position reached take-profit |

### New API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/alerts/preferences/:userId | Fetch alert prefs |
| POST | /api/alerts/preferences | Save alert prefs |
| POST | /api/alerts/test/telegram | Test Telegram connection |
| POST | /api/alerts/test/email | Test email delivery |
| GET | /api/alerts/log/:userId | Alert history |
| GET | /api/alerts/log/:userId/stats | Success/fail counts |

### New Environment Variables
```env
RESEND_API_KEY=re_your_key          # https://resend.com
ALERT_FROM_EMAIL=alerts@arbitex.io  # verified sender domain
TELEGRAM_BOT_TOKEN=123:your_token   # https://t.me/BotFather
```

---

## Session 9 — Performance Analytics

### Signal Outcome Tracking
Every resolved signal (win / loss / expired) is recorded in `signal_outcomes` with: exit price, PnL %, PnL USDT, R:R ratio, bars held, model used. The expiry worker now auto-records expired outcomes.

### Performance Summary
`GET /api/performance/summary?days=30` returns:
- Win rate, avg win/loss %, total PnL %, profit factor, Sharpe ratio, avg R:R
- Equity curve (cumulative PnL over time)
- Breakdown by symbol and by confidence level
- Best and worst signal

### Daily Snapshots
Hourly background worker snapshots daily performance to `performance_snapshots` for trend analysis.

### New API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/performance/summary | Full performance summary |
| GET | /api/performance/outcomes | Paginated outcome list |
| POST | /api/performance/record | Manually record outcome |
| GET | /api/performance/snapshots | Daily snapshot history |
| GET | /api/performance/leaderboard | Top performing symbols |
