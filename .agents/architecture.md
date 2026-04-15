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

## HTTPS / SSL Rollout Spec (Design-First, No-Code Yet)

### Goal

Harden production server by enabling trusted TLS certificates and serving all traffic over HTTPS while preserving MT5 EA and TradingView webhook reliability.

### Current State (inferred)

- Domain: `signal.mozasolution.com` points to VPS.
- App services:
  - `webhook` API on local HTTP (PM2, port 80 or internal app port behind proxy).
  - `webhook-ui` served by PM2 (public route `/ui`).
- Mixed HTTP/HTTPS usage currently exists across EA, UI, and browser clients.

### Target State

1. Public endpoints:
   - `https://signal.mozasolution.com/` (API + routes)
   - `https://signal.mozasolution.com/ui` (UI)
2. HTTP (port 80):
   - only used for ACME challenge + 301 redirect to HTTPS.
3. Internal app transport:
   - keep local HTTP between reverse proxy and node apps (simple and stable).
4. Certificate:
   - Let’s Encrypt certificate with auto-renew.

### Recommended Architecture

- Add Nginx as reverse proxy + TLS terminator.
- Keep Node/PM2 apps unchanged on localhost ports.
- Route map:
  - `/ui` and `/assets/*` -> webhook-ui upstream
  - `/mt5/*`, `/health`, `/csv`, `/signal` -> webhook upstream

### Compatibility Considerations

1. MT5 EA
- Set `InpServerBaseUrl` to `https://signal.mozasolution.com`.
- Ensure MT5 Options -> Expert Advisors allowlist includes HTTPS origin.

2. TradingView webhook
- Update alert webhook URLs to HTTPS endpoint.
- Keep legacy `/signal` route active for backward compatibility.

3. Browser/UI
- Use same-origin API in production to avoid mixed-content/CORS issues.

### Execution Plan (phased)

#### Phase 1: Precheck
- DNS A record correctness.
- Ports 80/443 open in firewall.
- Backup Nginx and PM2 configs.

#### Phase 2: Proxy + Cert
- Install Nginx + Certbot.
- Create Nginx server block for domain.
- Issue cert (`certbot --nginx -d signal.mozasolution.com`).
- Configure HTTP->HTTPS redirect.

#### Phase 3: App Routing Validation
- Verify:
  - `/health`
  - `/mt5/health`
  - `/ui/dashboard`
  - key API endpoints with API key.
- Verify TradingView and EA calls on HTTPS.

#### Phase 4: Hardening
- Add secure headers (HSTS optional after 24h soak).
- Confirm cert auto-renew timer.

### Rollback Plan

1. Disable HTTPS vhost and re-enable previous HTTP reverse proxy config.
2. Restart Nginx.
3. Keep app processes unchanged (PM2 rollback-free).

### Risks

1. DNS propagation mismatch causes ACME issuance failure.
2. MT5/Webhook allowlist not updated, causing EA pull/ack failures.
3. Forced HSTS too early can lock clients into bad TLS config if misconfigured.

### Acceptance Criteria

1. `curl -I https://signal.mozasolution.com/health` returns `200`.
2. `curl -I http://signal.mozasolution.com/health` returns `301/308` to HTTPS.
3. UI loads at `/ui/dashboard` over HTTPS without mixed-content errors.
4. EA pull/ack works via HTTPS origin.
