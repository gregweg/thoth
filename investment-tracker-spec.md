# Investment Learning Lab — Project Spec & Outline

A local, full-stack TypeScript web app for practicing daily investment "plays" across
multiple vehicles/strategies, tracking real market prices, and reviewing performance
at short- and longer-horizon checkpoints (same-day plus later follow-ups — not
strict calendar week/month/year windows). Transactions can be linked into groups so
multi-leg or multi-day trades roll up into a single performance view.

---

## 1. Goals

- Learn TypeScript end-to-end: shared types, a typed backend, a typed frontend, and a
  typed DB layer, all reinforcing the same domain model.
- Practice reasoning about different investment vehicles by actually logging daily
  "plays" and watching how they resolve over time.
- Build intuition for grouping/linking trades (hedges, rolls, scaling in, pairs) and
  seeing P&L at the group level vs. the individual leg level.

## 2. Non-goals (for now)

- Not a real brokerage integration — no live order execution.
- Not trying to be a production-grade trading platform — optimizing for learning and
  clarity of the type model over performance/scale.
- Not modeling taxes, margin requirements, or precise options assignment mechanics in v1.

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript everywhere | shared types across the stack |
| Monorepo | pnpm workspaces (`/apps/web`, `/apps/server`, `/packages/shared`) | one source of truth for domain types |
| Backend | Node + **Express** | thin API layer over the DB + market data client |
| DB | **PostgreSQL** via **Drizzle ORM** (Prisma is a fine alternative) | type-safe queries/schema, real relational features (arrays, JSONB for option metadata, proper concurrent writes), closer to a production setup |
| DB runtime | Existing local Postgres container (17 or 18.1-alpine) | reuse what's already running rather than spinning up a dedicated instance; new role + DB scoped to this project |
| Frontend | React + Vite + TS | fast iteration, good charting ecosystem |
| Charts | Recharts or visx | for equity curves / performance-over-time views |
| Market data | **Twelve Data** (free tier), behind a `MarketDataProvider` interface | real equity/ETF quotes; swappable/mockable in tests |
| Scheduling | Manual "Refresh Prices" action in v1; `node-cron` later for automated EOD snapshots | keep v1 simple; cron is a later exercise |

**Key learning move:** put all domain types (`Instrument`, `Play`, `Transaction`,
`PlayGroup`, etc.) in `packages/shared`, imported by both server and web. This is
where a lot of the "pure TypeScript" value comes from — one model, two consumers.

---

## 4. Core Domain Model

### Instrument
```ts
type VehicleType = "equity" | "option" | "future" | "crypto" | "etf";

interface Instrument {
  id: string;
  symbol: string;          // "AAPL", "AAPL240920C00200000" for an option, etc.
  vehicleType: VehicleType;
  underlyingSymbol?: string; // for options/futures
  meta?: OptionMeta | FutureMeta; // discriminated by vehicleType
}
```

### Strategy / Play
A **Play** is a single trade idea entered on a given day. It can involve one leg
(long equity) or several (an iron condor).

```ts
type StrategyType =
  | "long_equity" | "short_equity"
  | "long_call" | "long_put"
  | "covered_call" | "cash_secured_put"
  | "vertical_spread" | "straddle" | "strangle" | "iron_condor"
  | "long_future" | "short_future"
  | "pairs_trade";

interface Play {
  id: string;
  strategyType: StrategyType;
  entryDate: string;       // ISO date
  thesis?: string;         // why you made the play
  status: "open" | "closed";
  groupId?: string;        // optional link to a PlayGroup
}
```

### Transaction (a leg / fill)
```ts
interface Transaction {
  id: string;
  playId: string;
  instrumentId: string;
  side: "buy" | "sell" | "sell_short" | "buy_to_cover";
  quantity: number;
  price: number;
  fees?: number;
  executedAt: string;      // ISO datetime
}
```

### PlayGroup (the "link multiple transactions" piece)
```ts
type GroupType = "hedge" | "roll" | "scale_in" | "pairs" | "manual_bundle";

interface PlayGroup {
  id: string;
  name: string;
  groupType: GroupType;
  playIds: string[];       // plays that belong to this group
  createdAt: string;
}
```

Group-level P&L is just the sum of member plays' P&L at a given checkpoint — but
having it as a first-class entity lets you tag *why* things are linked and view them
together in the UI.

### Price Snapshot & Performance
```ts
interface PriceSnapshot {
  id: string;
  instrumentId: string;
  capturedAt: string;
  price: number;
  checkpoint: "entry" | "eod" | "follow_up" | "manual";
  // follow_up = a later checkpoint after entry (days/weeks later). Exact
  // week/month/year alignment is not required — purpose is to see P&L beyond
  // a single day, since many plays don't show meaningful move at eod alone.
}

interface PerformanceResult {
  playId: string;
  checkpoint: "eod" | "follow_up";
  unrealizedPnl: number;
  pctReturn: number;
  asOf: string;
}
```

Performance can be computed on the fly from snapshots + transactions rather than
stored — simpler to keep correct, and a nice place to practice pure TS functions with
good unit tests (P&L math is very testable).

---

## 5. Database Schema (Drizzle-style outline)

- `instruments`
- `transactions` (FK → `plays`, `instruments`)
- `plays` (FK → `play_groups`, nullable)
- `play_groups`
- `price_snapshots` (FK → `instruments`)
- `notes` / `tags` (optional, for journaling — freeform tagging of plays)

Indexes worth having early: `transactions.playId`, `price_snapshots.instrumentId +
checkpoint`, `plays.entryDate` (you'll query "today's plays" and "plays from N days
ago that need a checkpoint" constantly).

With Postgres you get a couple of nice upgrades over SQLite worth using:
- `JSONB` for the `Instrument.meta` field (option/future-specific data) instead of a
  stringified blob — Drizzle can type this against your `OptionMeta | FutureMeta`
  union.
- Native `numeric`/`decimal` types for price and quantity columns, which avoids the
  floating-point rounding issues you'd fight with SQLite's `REAL` type when doing P&L
  math.
- Proper `ENUM` types (or `text` + a check constraint) for `strategyType`, `side`,
  `checkpoint`, etc., enforced at the DB level in addition to the TS union types.

---

## 6. Daily Workflow

1. **Morning:** create one or more Plays for the day. Each Play gets its entry
   transaction(s), and the app fetches/records the entry price as an `entry`
   snapshot.
2. **Same day:** optionally capture an `eod` snapshot via a manual "Refresh Prices"
   action (background cron can come later).
3. **Follow-up checkpoints:** a "Plays needing a checkpoint" view surfaces open plays
   that have an `eod` snapshot, whose entry date is at least **5 calendar days** ago,
   and that do not yet have a `follow_up` snapshot. Refreshing pulls the current price
   and records a `follow_up` snapshot. (Exact week/month/year alignment is not
   required.)
4. **Review:** dashboard shows performance by Play, by Group, by StrategyType, and by
   time horizon — this is where you actually learn something (e.g., "my short plays
   look great at eod but bleed on later follow-ups").

---

## 7. Vehicle-by-Vehicle Learning Progression

The point of this project is to actually *learn* each vehicle/strategy, not just
build a generic trading log. So progression through strategies is **sequential and
gated**: functionality for a given strategy is built, then you must complete one real
mock trade through that exact strategy before the next one unlocks.

### 7.1 Suggested order

Ordered roughly from simplest mechanics to most complex, with grouping (pairs)
deliberately saved for last since it's the strategy that most exercises the
`PlayGroup` linking model:

1. `long_equity`
2. `short_equity`
3. `covered_call`
4. `cash_secured_put`
5. `long_call`
6. `long_put`
7. `vertical_spread`
8. `straddle`
9. `strangle`
10. `iron_condor`
11. `long_future`
12. `short_future`
13. `pairs_trade`

This order is **fixed for v1** — the app enforces it linearly. Reordering (or a
"reorder" UI) can be revisited later if needed; for now treat section 7.1 as the
canonical sequence.

### 7.2 What "complete" means

A strategy is marked **completed** — unlocking the next one — when all of the
following are true for at least one Play using that `strategyType`:

1. The Play has valid entry transaction(s) recorded (a real mock trade was placed,
   not just viewed).
2. At least one post-entry checkpoint has been captured for it (`eod` at minimum).
3. You've viewed the outcome on the strategy's results view and explicitly marked it
   reviewed (a deliberate "I looked at this and understood the result" action, not
   automatic — the point is the reflection, not just satisfying a checkbox).

**Working assumption for Phase 0:** gating requires only the `eod` checkpoint so
progression isn't bottlenecked waiting on longer horizons. Keep completed strategies'
Plays open and keep capturing `follow_up` snapshots after you've moved on —
completion unlocks the next strategy, it doesn't close the books on the current one.
**Revisit after Phase 0** whether `eod`-only feels too easy; tightening to require a
`follow_up` checkpoint is a small change to the gating logic.

### 7.3 Progress tracking

This needs a small piece of state beyond what's in the current schema — a
`strategy_progress` concept (one row per `StrategyType`) tracking `locked` /
`unlocked` / `completed`, plus which Play satisfied the completion criteria. Not
built yet; call this out explicitly when we get to Phase 0 of the build (below) since
it affects the schema.

### 7.4 UI implication

The app's navigation should reflect this directly: locked strategies show up
(so you can see what's coming and read about it, per section 8) but their trade
form is disabled with a message like "Complete [previous strategy] first." Completed
strategies stay fully accessible — you can always go back and place another trade in
a strategy you've already unlocked.

---

## 8. Vehicle Detail & Trade Page Spec

Every strategy gets its own dedicated page combining education and the mock trade
form. This is the core "learning" surface of the app.

### 8.1 Page sections

1. **Description** — plain-language explanation of the mechanism: what legs make up
   the trade, what market view it expresses, how it resolves.
2. **Economic cleavage** — what structural feature, inefficiency, or need in the
   economy/market this strategy exploits or serves. E.g.: short selling finds its
   edge in overvaluation and negative catalysts; a covered call finds its edge in
   selling volatility/time-decay to someone who wants convexity; a cash-secured put
   finds its edge in getting paid to commit to a price you'd buy at anyway.
3. **Benefits** — what this strategy is good at (income, defined risk, leverage,
   hedging, etc.).
4. **Risks** — what can go wrong and how (unlimited loss potential, assignment,
   liquidity/slippage, time decay working against you, correlation breakdown for
   pairs, etc.).
5. **When it's a good strategy** — the market/volatility regime, thesis type, or
   conditions under which this strategy tends to make sense (e.g. iron condors suit
   range-bound, low-realized-volatility conditions; long calls suit high-conviction
   directional views with defined risk).
6. **Real-world examples** — a short, non-exhaustive list of companies, sectors,
   commodities, or goods commonly associated with this strategy in practice (e.g.
   covered calls on large-cap dividend payers; short selling on overleveraged
   consumer discretionary names; pairs trades within a sector like the major airlines
   or the large regional banks). Framed as illustrative examples for orientation, not
   as trade recommendations.
7. **Trade form** — see 8.2.
8. **Past trades in this strategy** — once you've placed at least one trade here, a
   small list/table of prior Plays for this strategyType with their status and
   checkpoint results, so returning to a strategy after unlocking others still shows
   your history with it.

### 8.2 Trade form

The form's shape depends on the strategy's leg structure — a `long_equity` trade is
one leg (buy N shares); an `iron_condor` is four legs (buy/sell put spread + buy/sell
call spread). Rather than hand-building a bespoke form per strategy, define each
strategy's required legs as data:

```ts
interface LegTemplate {
  side: Side;
  vehicleType: VehicleType;
  label: string;          // "Long call (buy to open)"
  optional?: boolean;     // e.g. the "long" leg of a covered call may already be held
}

interface StrategyContent {
  strategyType: StrategyType;
  description: string;
  economicCleavage: string;
  benefits: string[];
  risks: string[];
  goodConditions: string[];
  exampleSectorsOrCompanies: string[];
  legs: LegTemplate[];
}

type StrategyContentRegistry = Record<StrategyType, StrategyContent>;
```

This `StrategyContentRegistry` lives in `packages/shared` — it's what both renders
the education sections (8.1) and drives the dynamic trade form (8.2), so the content
and the form structure can't drift out of sync. Submitting the form creates one
`Play` plus one `Transaction` per leg, exactly like any other trade in the system —
no separate data path for "mock" vs. real, since everything in this app is a mock
trade against real prices.

### 8.3 Content is a real task, not just UI work

Writing accurate description/cleavage/benefits/risks/conditions/examples content for
all 13 strategies is a genuine research-and-writing task, not something to stub out
with placeholder text — treat it as part of the work for each strategy, done when its
turn comes up in the sequence (section 7.1), not all at once up front.

---

## 9. Suggested Build Phases

**Phase 0 — Shared infrastructure (build once, before the first strategy)**
- Shared types package, Drizzle schema + migrations, including `strategy_progress`
  (section 7.3)
- Market data client (`MarketDataProvider` interface + Twelve Data implementation)
- Generic Play + Transaction pipeline (create, list, close)
- Entry + `eod` snapshot capture, plus the follow-up checkpoint view (manual refresh)
- The `StrategyContentRegistry` type and the generic Vehicle Detail & Trade page
  template that renders any `StrategyContent` entry and its dynamic leg-based form
  (section 8)
- The progression/gating logic (locked/unlocked/completed) and the nav UI that
  reflects it
- Basic P&L calc for a single-leg trade + a plain results view

**Phase 1 → 13 — One phase per strategy, in the order from section 7.1**

Each of these phases is small and repeats the same shape:
1. Write that strategy's `StrategyContent` entry (description, cleavage, benefits,
   risks, conditions, examples) and its `LegTemplate[]`.
2. Extend the P&L calculation for that strategy's leg structure if the generic
   single-leg calc from Phase 0 doesn't already cover it (multi-leg options are where
   this actually diverges).
3. Place one real mock trade through the strategy's page.
4. Let it reach at least an `eod` checkpoint, review the result, mark it reviewed.
5. Confirm the next strategy unlocks.

**Phase 1 (`long_equity`) — content done in code.** Education copy lives in
`packages/shared` `strategyContentRegistry.long_equity`. Single-leg P&L from Phase 0
already covers this strategy. Remaining: place a practice trade in the UI, capture
`eod`, mark reviewed, confirm `short_equity` unlocks (skip if already completed
during Phase 0 smoke testing).

**Phase 2 (`short_equity`) — content done in code.** Education copy in
`strategyContentRegistry.short_equity`. Entry leg is `sell_short`; Phase 0 single-leg
P&L already inverts correctly when price falls. Place a practice short in the UI,
capture `eod`, mark reviewed, confirm `covered_call` unlocks.

Grouping (`PlayGroup`) functionality gets built out during the `pairs_trade` phase
(#13), since that's the strategy that actually needs it — earlier strategies can
technically be assigned to a group manually, but there's no strong reason to before
then.

**Phase 14 — Polish / stretch (after all 13 strategies are unlocked)**
- Dashboard rollups across all strategies (performance by strategy, by time window)
- Notes/tags journaling, win-rate & basic risk stats, historical replay mode using
  stored snapshots, CSV export.

---

## 10. Decisions (formerly open questions)

1. **Market data provider — Twelve Data.** Wrap it behind `MarketDataProvider` so it
   stays swappable and mockable in tests.
2. **Checkpoint horizons — flexible, not exact week/month/year.** The point of a
   post-`eod` checkpoint is that many plays don't show a meaningful move in a single
   day. Use a `follow_up` checkpoint due **5 calendar days** after entry (once `eod`
   exists) rather than hard `plus_1w` / `plus_1m` / calendar-aligned windows.
3. **Options pricing — synthetic, grounded in current market data.** Don't depend on
   live options chains for learning. Derive simplified/synthetic option prices from
   current underlying quotes (and any other market inputs Twelve Data provides) so
   options strategies stay educational without full chain/greeks complexity.
4. **Snapshot cadence — manual for now.** "Refresh Prices" in the UI for v1;
   background `node-cron` EOD snapshots are deferred.
5. **Local Postgres — existing container + `investments_app` role.** Use Docker
   container `virya-postgres-test` (host port **55432**), role `investments_app`,
   database `investments`. Isolation is at the role/DB level. Credentials live in
   `.env` (gitignored); don't reuse this role for other projects.
6. **Completion gate strictness — revisit after Phase 0.** Start with `eod`-only
   unlock (section 7.2). After Phase 0 is usable, decide whether to require a
   `follow_up` checkpoint before unlocking the next strategy.
7. **Strategy order — fixed for now.** Section 7.1 is the enforced sequence; no
   reorder UI in v1.

---

## 11. Suggested Repo Layout

```
/apps
  /web        (React + Vite)
  /server     (Express + Drizzle)
/packages
  /shared     (domain types, P&L calculation functions, zod schemas)
/drizzle      (migrations)
.env          (DATABASE_URL for the investments_app role, gitignored)
```

Keeping P&L math and domain types in `packages/shared` — with no dependency on
Express/React — makes them trivially unit-testable and reusable if you ever swap the
frontend or backend framework.
