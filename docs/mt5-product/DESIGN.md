# MT5 Product Design

## Goals
- Multi-user trade journal + execution monitor.
- Low ops overhead, lightweight deployment.
- Backward compatible with existing EA polling.

## Architecture
- `webhook/server.js`: ingestion + queue + read APIs.
- `Postgres`: users + accounts + signals + signal_events.
- `web-ui` (React + Vite): dashboard and trade exploration.

## Key decisions
1. Keep `/mt5/ea/pull` and `/mt5/ea/ack` unchanged so EA is stable.
2. Introduce new read endpoints for UI (`/mt5/dashboard/*`, `/mt5/trades/search`, `/mt5/trades/:id`).
3. Use polling (5s) instead of websockets/SSE for now to keep infra simple.
4. Store password hash only (never plain password).
5. Keep `accounts` table as the account-state source of truth for multi-account support.

## Accounts table concept (current state)

- Purpose: represent broker account-level state (`balance`, `status`, metadata) separately from trade signals.
- Ownership: each `accounts.account_id` belongs to one `users.user_id`.
- Signal-level routing is still primarily `signals.user_id` today; `account_id` propagation in signal flows is not fully wired yet.
- EA heartbeat endpoint exists: `POST /mt5/ea/heartbeat` with required `account_id`.
- Current implementation note: heartbeat endpoint validates payload but still has TODO for DB upsert into `accounts`.

## API contract (new)
- `GET /mt5/dashboard/summary`
- `GET /mt5/dashboard/pnl-series?period=today|week|month`
- `GET /mt5/filters/symbols`
- `GET /mt5/trades/search?page=1&pageSize=20&symbol=&status=&range=`
- `GET /mt5/trades/:signal_id` (includes `events[]` timeline)

## Security notes
- DB credentials loaded from env (`MT5_POSTGRES_URL`), not hardcoded.
- Admin APIs use `SIGNAL_API_KEY`/`x-api-key` gate (current model).
- Recommended next step: separate UI auth from webhook auth.

## UI Form Design Rules
- Do not include editable ID fields (`*_id`) in create/update forms. IDs are system-generated and shown as read-only labels only when needed.
- On create-new forms, hide auto-generated IDs entirely (for example `User ID`, `Account ID`). Show IDs only in update/edit mode.
- For any `status`/`state` form field, use enum/select inputs only (never free-text). The first enum option is the default.
- Create flows use a two-step pattern:
  - First step: a `secondary` toggle button (`Create <Entity>`) that only opens/closes the form.
  - Open state: toggle button text changes to `Cancel`.
  - Real data write uses a `primary` submit button inside the form (`Save <Entity>` / `Save`).
- `primary` buttons are reserved for actual insert/update operations only. Buttons that only open forms must be `secondary`.
- Place the secondary create-toggle button below the list/table area (not in filter toolbar).
- Place submit (`Save <Entity>`) and create-toggle (`Create <Entity>` / `Cancel`) on the same line in the form.
- If total pages is `1`, do not display pagination controls.
- Status/state visual rule:
  - Active/True -> yellow
  - Inactive/Disable/False -> gray
- Button labeling rule:
  - In grid/table action columns, use icon-only buttons to save horizontal space.
  - In forms/detail panels, use icon + full text labels for clarity.
  - Example: edit action uses a pencil icon.

## TradingView Emission Contract (Refactor-Safe)

This contract is mandatory and must be preserved in refactors:

1. Final outbound webhook emit is realtime-only.
- Emitter path uses realtime gate before `alert(...)`.
- Production call sites use `realtimeOnly=true`.

2. Processing gate and emission gate are separate by design.
- Signal/state processing may run on realtime or confirmed bars.
- Outbound webhook creation must still require realtime at final gate.

3. No historical backfill push.
- Reloading chart, switching symbol, or switching timeframe must not generate historical trade webhook events.

4. Timeframe semantics in payload.
- `chartTf`: chart timeframe that triggered the alert context.
- `sourceTf`/HTF: model context timeframe (may differ from chartTf).
- UI should display both; do not collapse one into the other.
