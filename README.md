# Arbitex

> AI-powered trading infrastructure for the Bitget AI Challenge  
> Built with Next.js · Fastify · Supabase · Kimi K2 (HuggingFace)

---

## Monorepo Structure

```
arbitex/
├── apps/
│   ├── web/                  # Next.js 14 frontend
│   └── api/                  # Fastify backend
├── packages/
│   ├── types/                # Shared TypeScript types
│   ├── config/               # Shared configuration
│   └── utils/                # Shared utilities
├── supabase/
│   └── schema.sql            # Full DB schema
├── .env.example
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Tech Stack

| Layer       | Technology                              |
|-------------|----------------------------------------|
| Frontend    | Next.js 14, Tailwind CSS, Zustand, Recharts |
| Backend     | Fastify, WebSocket                     |
| Database    | Supabase (PostgreSQL + Auth + Realtime) |
| Trading     | Bitget REST API + WebSocket            |
| AI          | Kimi K2 via HuggingFace Inference      |
| Monorepo    | Turborepo + pnpm workspaces            |

---

## Build Sessions

| Session | Scope                                         | Status     |
|---------|-----------------------------------------------|------------|
| 1       | Architecture, scaffold, schema, stubs         | ✅ Done    |
| 2       | Bitget integration, live data, WebSocket      | 🔜 Next    |
| 3       | Kimi K2 AI signal generation                  | ⬜ Pending |
| 4       | Dashboard UI, auth, trade execution           | ⬜ Pending |
| 5       | Polish, rate limiting, deploy                 | ⬜ Pending |

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy env vars
cp .env.example .env
# Fill in your Supabase, Bitget, and HuggingFace credentials

# Run Supabase schema
# Paste supabase/schema.sql into your Supabase SQL editor

# Start all apps
pnpm dev
```

Apps will run at:
- **Web** → http://localhost:3000  
- **API** → http://localhost:4000  
- **Health** → http://localhost:4000/health

---

## Environment Variables

See `.env.example` for the full list. Key variables:

```env
BITGET_API_KEY=         # Bitget API key
BITGET_API_SECRET=      # Bitget API secret
BITGET_PASSPHRASE=      # Bitget passphrase
HUGGINGFACE_API_TOKEN=  # HuggingFace token for Kimi K2
SUPABASE_URL=           # Supabase project URL
SUPABASE_ANON_KEY=      # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY= # Supabase service role key
```
