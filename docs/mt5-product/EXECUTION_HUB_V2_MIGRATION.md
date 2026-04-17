# Execution Hub V2 Migration Contract

Date: 2026-04-17  
Status: Phase 1 contract (implementation starts in Phase 2)

## 1) Objectives

- Split immutable signal feed from executable trade ledger.
- Move authentication ownership from `user_api_keys` to `accounts.api_key_hash`.
- Preserve production behavior during rollout by dual-write and feature flags.

## 2) Feature flags

- `V2_SCHEMA_ENABLED`:
  - create/validate v2 tables and new columns.
- `V2_DUAL_WRITE_ENABLED`:
  - on signal ingest, write both legacy signal status flow and v2 (`signals` immutable + `trades` fan-out).
- `V2_BROKER_API_ENABLED`:
  - enable `/v2/broker/*` pull/ack/sync endpoints.
- `V2_UI_ENABLED`:
  - show v2 management pages (sources/subscriptions/trade timeline).
- `V2_CUTOVER_ENABLED`:
  - route broker clients to v2 only, disable legacy lock/ack paths.

## 3) Migration phases

1. **Schema prepare**
- Apply [`EXECUTION_HUB_V2_SCHEMA.sql`](/Users/macmini/Trade/Bot/trading/docs/mt5-product/EXECUTION_HUB_V2_SCHEMA.sql).
- Keep legacy tables/columns active.

2. **Backfill**
- Create default `source` rows for existing `signals.source` values.
- For each active account, generate `accounts.api_key_hash` from current effective key.
- Build initial `account_sources` from current user/account mapping rules.
- Helper script (postgres): `node scripts/mt5_v2_backfill.js`

3. **Dual-write**
- On each source signal ingest:
  - insert immutable `signals` row.
  - find account subscriptions (`account_sources`).
  - insert one `trades` row per subscribed account (`dispatch_status=NEW`, `execution_status=PENDING`).

4. **Broker cut-in**
- Introduce `/v2/broker/pull`, `/v2/broker/ack`, `/v2/broker/sync`.
- Migrate one broker/account pair first (canary), then batch migration.

5. **Cutover**
- Flip `V2_CUTOVER_ENABLED`.
- Freeze legacy lock/ack endpoints for writes (read-only transitional window).
- Remove `user_api_keys` usage from auth path.

6. **Cleanup**
- Drop `user_api_keys` table.
- Stop writing legacy status fields on `signals`.
- Remove obsolete code paths and endpoints.

## 4) Data rules

- `signals` is append-only from business perspective.
- `trades` is mutable execution state ledger.
- `trade_events` is append-only audit trail.
- `signal_id` and `source_id` are nullable for broker-originated trades.
- `accounts.api_key_hash` is unique and the sole broker auth lookup in v2.

## 5) Idempotency and replay

- Source ingest idempotency key: (`source_id`, `external_signal_id`) when provided.
- Broker ack idempotency key: (`trade_id`, `idempotency_key`) in `trade_events`.
- Lease expiry enables re-delivery; clients must handle at-least-once semantics.

## 6) Rollback plan

- If v2 failure occurs before cutover:
  - disable `V2_BROKER_API_ENABLED` and `V2_DUAL_WRITE_ENABLED`.
  - continue legacy flow unaffected.
- If failure occurs after cutover:
  - re-enable legacy pull endpoints for selected accounts via allowlist,
  - keep v2 writes for observability,
  - reconcile trade divergence with `/v2/broker/sync`.

## 7) Acceptance checklist for Phase 2 start

- [ ] Schema applied in staging with no destructive changes.
- [ ] Backfill scripts validated on staging snapshot.
- [ ] Dual-write creates expected trade fan-out count.
- [ ] v2 broker canary account completes pull -> ack -> sync loop.
- [ ] Dashboards expose lease timeout/error counters.
