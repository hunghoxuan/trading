# MT5 Product Design

## Goals
- Multi-user trade journal + execution monitor.
- Low ops overhead, lightweight deployment.
- Backward compatible with existing EA polling.

## Architecture
- `webhook/server.js`: ingestion + queue + read APIs.
- `Postgres`: users + signals (and upcoming signal_events).
- `webhook-ui` (React + Vite): dashboard and trade exploration.

## Key decisions
1. Keep `/mt5/ea/pull` and `/mt5/ea/ack` unchanged so EA is stable.
2. Introduce new read endpoints for UI (`/mt5/dashboard/*`, `/mt5/trades/search`, `/mt5/trades/:id`).
3. Use polling (5s) instead of websockets/SSE for now to keep infra simple.
4. Store password hash only (never plain password).

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
