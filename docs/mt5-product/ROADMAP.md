# Roadmap

## Status Snapshot (2026-04-12)
- Sprint A: done
- Sprint B: in progress
- Sprint C: pending

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

## Infra recommendation
Current droplet (`1 vCPU / 512MB`) is acceptable for testing only.
For live usage with Postgres + Node + UI + PM2, target at least:
- 1 vCPU / 2GB RAM / 50GB disk
- Optional managed Postgres for reliability
