# Active Sprint

## Sprint Goal
Achieve 100% synchronization reliability between MT5 and VPS to eliminate "Ghost Trades" and "LOCKED" deadlocks.

## Currently Doing
- [x] [2026-04-16 13:14] [Reliability] [Author: Hung] Task: **Full State Reconciliation System**.
    - [x] Phase 1: Implement Server `/mt5/ea/sync` (Active list fetch).
    - [x] Phase 2: Implement Server `/mt5/ea/bulk-sync` (Batch status update).
    - [x] Phase 3: Implement EA `SyncWithVps()` loop to reconcile MT5 state to VPS. (`P0`)
- [ ] [2026-04-14 15:00] [Hung - Core] [Author: User] Task: Audit and reduce non-essential gate/score/limitation branches. (`P0`)
- [x] [2026-04-17 21:18] [Architecture/DB/API/Web-UI] [Author: Codex] Task: Execution Hub V2 Phase 2 - implement DB migrations + dual-write ingest (`signals` immutable + `trades` fan-out).
- [x] [2026-04-18 07:15] [Web-UI] [Author: Codex] Task: UI/UX Standardization and Split (`Signals` feed auditing vs `Trades` execution ledger).
    - [x] Add v2 schema auto-bootstrap (`sources`, `account_sources`, `trades`, `trade_events`) for sqlite/postgres.
    - [x] Add feature-flagged dual-write fan-out from signal ingest into v2 `trades`.
    - [x] Add backfill helper `scripts/mt5_v2_backfill.js` (postgres).
    - [x] Add first v2 broker runtime endpoints: `/v2/broker/pull`, `/v2/broker/ack` (feature-flagged).
    - [x] Add `/v2/broker/sync` + account API-key rotation endpoint and production test scripts.
    - [x] Add `/v2/broker/heartbeat` + `/v2/broker/trades/create` endpoints and smoke scripts.
    - [x] Add `/v2/accounts/{id}/subscriptions` GET/PUT + web-ui subscriptions management page.
    - [x] Add `/v2/sources` POST + `/v2/sources/{id}` PUT + web-ui sources management page.
    - [x] Add `/v2/sources/{id}/auth-secret/rotate|revoke` + `/v2/sources/{id}/events` with source audit trail UI.
    - [x] Add `/v2/trades` + `/v2/trades/{id}/events` and web-ui `Execution V2` inspection page.
    - [x] Add `/v2/accounts` POST + `/v2/accounts/{id}` PUT and web-ui `Accounts V2` management page.
    - [x] Fix nullable balance regression on account updates (preserve `null` when balance is omitted).
    - [x] Add guarded account archive flow: `DELETE /v2/accounts/{id}` blocks when open/pending trades exist; add `ARCHIVE` action in `Accounts V2` UI.

## Up Next
- [ ] [2026-04-15 12:25] [Infra/Deployment] Task: SSL/TLS and HTTPS Enforcement.
- [ ] [2026-04-15 16:30] [Architecture] Task: Dashboard Phase-2 (Account Balance/Equity Cards).
- [ ] [2026-04-17 21:12] [Architecture/DB/API/Web-UI] [Author: Codex] [TODO: Codex] Task: Plan and stage Execution Hub V2 migration (`signals` immutable reference feed, `trades` execution ledger, account-level API key ownership, account-source subscriptions, broker pull by account scope).
    - [x] Phase 1: Finalize v2 schema + API contracts + migration plan.
    - [x] Phase 2: Implement DB migrations + dual-write ingest (`signals` + `trades` fan-out).
    - [x] Phase 3: Implement broker v2 pull/ack/lease/sync endpoints.
    - [x] Phase 4: Upgrade Web UI management (sources/accounts/subscriptions/trades/events).
        - [x] Unify Timeframe format to numeric in DB, string labels in UI.
        - [x] Standardize Dashboard Toolbar layout (Create button position).
        - [x] Implement Account Detail Drawer (Subscriptions + Trade History).
        - [x] Implement Broker Registry UI (Brokers Table + Mapping).
    - [ ] Phase 5: Cutover + Deployment
        - [ ] **Infrastructure/Security**:
            - [ ] Finalize account-level API key ownership and signed-request validation (HMAC).
            - [ ] Enforce HTTPS for all broker/TV endpoints.
        - [ ] **Data Migration**:
            - [ ] Complete full backfill from `signals` -> `trades`.
            - [ ] Implement aggressive pruning/deletion of legacy status data in `signals` (keep only as raw audit log).
        - [ ] **Client Updates**:
            - [ ] Update **EA Client** (`TVBridgeEA.mq5`) to use `/v2/broker/pull` and account-scoped sync.
            - [ ] Update **PineScript** strategies to support V2 `source_id` payloads and intent-based mapping.
        - [ ] **UI/Analytic Finalization**:
            - [ ] Clean up UI: Remove legacy one-page dashboards and old status-badge logic.
            - [ ] Rewrite **Dashboard** logic to aggregate from the `trades` ledger (account-level PnL, equity snapshots).
            - [ ] System-wide stress test and legacy endpoint deprecation.
