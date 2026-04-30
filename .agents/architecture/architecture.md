# Architecture

## Core
- Backend: Node webhook.
- UI: React app.
- EA: `mql5/TVBridgeEA.mq5`.
- Production DB: Postgres.
- Main runtime migrations live in `webhook/server.js`.

## Identity
- Internal key: `id BIGSERIAL`.
- Public key: `sid TEXT UNIQUE NOT NULL`.
- Legacy keys stay:
  - `signal_id`
  - `trade_id`
  - `account_id`
  - `source_id`
  - `profile_id`
- API resolves identifiers in order:
  1. numeric `id`
  2. `sid`
  3. legacy key

## Signals
- Signals are reference feed records.
- Generated IDs use `SIG_*`.
- Core fields: user, source, symbol, side, SL, TP, timeframe, RR, raw JSON, status.

## Trades
- Trades are account-bound execution ledger records.
- Generated IDs use `TRD_*`.
- Core fields: account, user, broker, signal, source, origin, symbol, side, intent, execution state, MT5 ticket, realized metrics.

## Logs
- Use unified `logs` table for audit trail.
- Prefer `mt5Log(...)` over feature-specific event tables.

## Symbols
- Normalize broker symbols uppercase.
- Remove separators/special chars.
- Examples:
  - `BTC/USDT` -> `BTCUSDT`
  - `EUR-USD` -> `EURUSD`

## Metadata
- Non-secret user preferences live in `users.metadata`.
- Used for:
  - language
  - timezone
  - market-data cron toggle
  - AI-analysis cron toggle
  - symbol watchlist

## Compatibility
- EA/log payloads may still use legacy IDs.
- Server resolves `id/sid` to legacy keys where needed.
- Do not break old EA/webhook integrations without migration plan.
