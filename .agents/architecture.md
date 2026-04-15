# Project Architecture

## Core System Map

- TradingView/Pine sends signals to `webhook/server.js`.
- MT5 EA pulls queue via `/mt5/ea/pull` and posts execution updates via `/mt5/ea/ack`.
- Data tables in DB layer: `users`, `accounts`, `signals`, `signal_events`.
- Webhook-UI (`webhook-ui`) reads dashboard/trade APIs and renders operational state.

## Accounts Concept (Current)

- `accounts` is the broker-account state table (account-level identity + balance/status + metadata).
- It is designed to support multi-account operation under one `user_id`.
- Current implementation status:
  - Table exists in SQLite/Postgres schema.
  - `/mt5/ea/heartbeat` endpoint requires `account_id`.
  - Server still has TODO for heartbeat upsert into `accounts` (not fully wired yet).
- Signals currently key primarily by `signal_id` + `user_id`; `account_id` linkage is partial/roadmap.

## Dashboard Spec v1 (Design-First, No-Code Yet)

### Goals

1. Show real account health quickly:
   - Current Account Balance
   - Current PnL (selected period and all-time)
2. Show trade outcome quality by status in fixed business order:
   - `TP`, `SL`, `START`, `OK`, `OTHER`
   - `OTHER` aggregates `REJECT`, `CANCEL`, `FAIL` (+ any unknown terminal failure states).
3. Enable focused analysis with filters:
   - Time range: `Today`, `Week`, `Month`, `Year`
   - Symbols: single select or multi-select, default `All symbols`

### Information Architecture

#### Row 1: Executive KPIs

- Account Balance (latest account snapshot)
- PnL (period)
- PnL (all-time)
- Total Trades (period)
- Win Rate (period)

#### Row 2: Status Distribution (Ordered)

- Horizontal bars or compact cards in strict order:
  - TP
  - SL
  - START
  - OK
  - OTHER
- Each shows:
  - count
  - percentage of total (period-filtered)

#### Row 3: Trend + Mix

- PnL trend chart (bucket by hour/day depending range)
- Symbol contribution chart (top N symbols by trade count or PnL)

#### Row 4: Operational Table

- Recent trades table/list with key columns:
  - time, symbol, side, order_type, status, pnl, note, signal_id
- Click opens trade detail/timeline page

### Filter Behavior

- Filters are global to dashboard widgets.
- Time range presets map to UTC windows on backend.
- Symbol filter applies as `IN (...)`; `All` bypasses symbol constraint.
- Filter state is URL-sync (`?range=month&symbols=EURUSD,GBPUSD`) to support sharing.

### Metrics Definitions

- **Account Balance:** latest known balance snapshot from EA/account feed.
- **Current PnL (period):** sum of realized pnl in selected range.
- **Win Rate:** `TP / (TP + SL + FAIL + CANCEL + REJECT)` for selected range.
- **OTHER bucket:** status in `{FAIL, CANCEL, REJECT}` plus unknown failure-like statuses.

### API Contract (Planned)

- `GET /mt5/dashboard/summary?range=today|week|month|year&symbols=...`
  - returns:
    - `account`: `{ balance, equity, free_margin, as_of }`
    - `kpis`
    - `status_counts_ordered`
    - `top_symbols`
- `GET /mt5/dashboard/pnl-series?range=...&symbols=...`
  - returns chart points.
- Keep backward compatibility with current summary response fields.

### UX/Visual Standards

- Keep dense layout (avoid oversized cards).
- Prioritize legibility over decoration.
- Status colors must be consistent with trade cards.
- Mobile: collapse charts into stack; keep filters sticky and compact.

### Risks / Open Questions

1. Account balance source consistency across multi-account setups.
2. `START` vs `OK` lifecycle meaning must remain stable in backend mapping.
3. Timezone display policy (store UTC, display local with explicit label).

### Acceptance Criteria (for coding phase)

1. Dashboard shows balance + period pnl + all-time pnl.
2. Status block uses exact order: TP, SL, START, OK, OTHER.
3. Time filter and symbol filter affect all dashboard widgets consistently.
4. API and UI are covered by smoke test scripts.

## Contracts

- Data payloads
- Webhook APIs
- Dashboard API summary/series schema
