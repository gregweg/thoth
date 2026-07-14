# Investment Learning Lab

Local TypeScript monorepo for practicing daily investment plays with real market
prices (Twelve Data), gated strategy progression, and manual eod / follow-up
checkpoints.

## Stack

- `apps/web` — React + Vite
- `apps/server` — Express + Drizzle
- `packages/shared` — domain types, zod schemas, P&L helpers
- Postgres DB `investments` as role `investments_app` (Docker: `virya-postgres-test`, host port `55432`)

## Setup

```bash
cp .env.example .env
# set DATABASE_URL (postgresql://investments_app:...@localhost:55432/investments)
# optionally TWELVE_DATA_API_KEY; USE_MOCK_MARKET_DATA=true works without a key

pnpm install
pnpm --filter @ill/shared build
pnpm db:migrate
pnpm dev
```

Follow-up checkpoints are due **5 calendar days** after entry (once an `eod`
snapshot exists).

- Web: http://localhost:5173
- API: http://localhost:3001

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Start API + web |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply migrations + seed strategy progress |
| `pnpm test` | Run package tests |
