# Roadmap

## Status Snapshot (2026-04-17)
- Sprint A: done
- Sprint B: in progress
- Sprint C: pending
- Sprint D: planned

## Sprint A (done)
- Backend schema uplift.
- New dashboard/trade read APIs.
- React UI scaffold (dashboard, list, detail).

## Sprint B (in progress)
- [x] Event timeline write path + trade detail timeline API/UI.
- [ ] Richer chart data (OHLC feed for detail page).
- [ ] Simple API auth hardening: move from payload `api_key` to TV token-path + header keys, with revoke and multi-key support.
- User management (create, disable, reset password hash).
- UI auth and per-user isolation.

## Sprint C
- Advanced analytics (equity curve, expectancy, drawdown).
- Alerting and health notifications.
- Performance hardening and caching.

## Sprint D (in progress) - Execution Hub V2
- Goal: decouple immutable `signals` from real `trades` execution lifecycle and scale to many sources + many accounts.
- Phase 1 (Design lock): completed. Contracts are published in:
  - `docs/mt5-product/EXECUTION_HUB_V2_SCHEMA.sql`
  - `docs/mt5-product/EXECUTION_HUB_V2_API.yaml`
  - `docs/mt5-product/EXECUTION_HUB_V2_MIGRATION.md`
- Phase 2 (Data layer): add migrations and dual-write flow so source ingest creates immutable `signals` and account-scoped `trades (NEW)`.
- Phase 3 (Broker runtime): implement lease-based broker pull + idempotent ack + reconcile sync using account API key ownership.
- Phase 4 (Web UI): add management pages for sources, accounts, subscriptions, and trade/event operations.
- Phase 5 (Cutover): move EA/bots to v2 endpoints, deprecate `user_api_keys`, and retire status-on-signal legacy path.

## Infra recommendation
Current droplet (`1 vCPU / 512MB`) is acceptable for testing only.
For live usage with Postgres + Node + UI + PM2, target at least:
- 1 vCPU / 2GB RAM / 50GB disk
- Optional managed Postgres for reliability
