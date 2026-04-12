# Roadmap

## Sprint A (current)
- Backend schema uplift.
- New dashboard/trade read APIs.
- React UI scaffold (dashboard, list, detail).

## Sprint B
- Event timeline + richer chart data.
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
