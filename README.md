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
