# Active Sprint

## Sprint Goal
Achieve 100% synchronization reliability between MT5 and VPS to eliminate "Ghost Trades" and "LOCKED" deadlocks.

## Currently Doing
- [x] [2026-04-16 13:14] [Reliability] [Author: Hung] Task: **Full State Reconciliation System**.
    - [x] Phase 1: Implement Server `/mt5/ea/sync` (Active list fetch).
    - [x] Phase 2: Implement Server `/mt5/ea/bulk-sync` (Batch status update).
    - [x] Phase 3: Implement EA `SyncWithVps()` loop to reconcile MT5 state to VPS. (`P0`)
- [ ] [2026-04-14 15:00] [Hung - Core] [Author: User] Task: Audit and reduce non-essential gate/score/limitation branches. (`P0`)
- [x] [2026-04-17 21:18] [Architecture/DB/API/Web-UI] [Author: Codex] Task: Execution Hub V2 Phase 1 - finalize SQL schema contracts and v2 API contracts for implementation.
- [ ] [2026-04-17 22:05] [Architecture/DB/API/Web-UI] [Author: Codex] [DOING][TODO: Codex] Task: Execution Hub V2 Phase 2 - implement DB migrations + dual-write ingest (`signals` immutable + `trades` fan-out).
    - [x] Add v2 schema auto-bootstrap (`sources`, `account_sources`, `trades`, `trade_events`) for sqlite/postgres.
    - [x] Add feature-flagged dual-write fan-out from signal ingest into v2 `trades`.
    - [x] Add backfill helper `scripts/mt5_v2_backfill.js` (postgres).
    - [x] Add first v2 broker runtime endpoints: `/v2/broker/pull`, `/v2/broker/ack` (feature-flagged).
    - [x] Add `/v2/broker/sync` + account API-key rotation endpoint and production test scripts.
    - [x] Add `/v2/broker/heartbeat` + `/v2/broker/trades/create` endpoints and smoke scripts.
    - [x] Add `/v2/accounts/{id}/subscriptions` GET/PUT + web-ui subscriptions management page.

## Up Next
- [ ] [2026-04-15 12:25] [Infra/Deployment] Task: SSL/TLS and HTTPS Enforcement.
- [ ] [2026-04-15 16:30] [Architecture] Task: Dashboard Phase-2 (Account Balance/Equity Cards).
- [ ] [2026-04-17 21:12] [Architecture/DB/API/Web-UI] [Author: Codex] [TODO: Codex] Task: Plan and stage Execution Hub V2 migration (`signals` immutable reference feed, `trades` execution ledger, account-level API key ownership, account-source subscriptions, broker pull by account scope).
    - [x] Phase 1: Finalize v2 schema + API contracts + migration plan.
    - [ ] Phase 2: Implement DB migrations + dual-write ingest (`signals` + `trades` fan-out).
    - [ ] Phase 3: Implement broker v2 pull/ack/lease/sync endpoints.
    - [ ] Phase 4: Upgrade Web UI management (sources/accounts/subscriptions/trades/events).
    - [ ] Phase 5: Cutover + deprecate legacy `user_api_keys` and signal-status flow.
