# MT5 Product Backlog

## Phase 1 (done in this iteration)
- [x] Introduce `users` table.
- [x] Migrate queue table from `mt5_signals` to `signals` (backward-compatible migration).
- [x] Add planned/realized risk-money fields (`rr_planned`, `risk_money_planned`, `pnl_money_realized`).
- [x] Add dashboard/trade APIs for React frontend.
- [x] Keep legacy EA endpoints stable (`/mt5/ea/pull`, `/mt5/ea/ack`).

## Phase 2
- [ ] Add `signal_events` write path on each state transition.
- [ ] Add user CRUD endpoints (admin-only).
- [ ] Add login/session layer for UI (JWT or session cookie).
- [ ] Improve trade detail chart with actual OHLC feed backend.

## Phase 3
- [ ] Add equity curve endpoint by user and period.
- [ ] Add broker-account mapping (one user to many accounts).
- [ ] Add role-based access (owner/admin/viewer).
- [ ] Add export (CSV/PDF) for metrics and trades.
