# Architectural Refactor: Sequential Identity & Unified Logs (V2.1)

## 1. Core Changes

### Sequential Identity (`mt5GenerateId`)
- **Philosophy**: All IDs (`signal_id`, `trade_id`) are now generated internally based on high-resolution timestamps.
- **Benefits**:
  - **Perfect Chronological Ordering**: New signals/trades always sort naturally by ID.
  - **Collision Prevention**: Random hex suffixes ensure uniqueness across multiple users/sources.
- **Implement**: `SIG_1776..._ABCD` / `TRD_1776..._EFGH`.

### Standardized Symbol Normalization (`mt5NormalizeSymbol`)
- **Standard**: All broker symbols are converted to uppercase with all special characters removed.
- **Example**: `BTC/USDT` → `BTCUSDT`, `EUR-USD` → `EURUSD`.

### Unified Logging System (`logs` table)
- **Consolidation**: Replaces `signal_events`, `trade_events`, and `source_events` with a single table.
- **Efficiency**: Reduces table count and simplifies audit trail queries.

---

## 2. Updated Database Schema (PostgreSQL)

### `signals` (Simplified)
- `signal_id` (PK)
- `created_at`
- `user_id` (Redundant FK)
- `source`, `source_id`
- `symbol`, `side`
- `sl`, `tp`, `signal_tf`, `chart_tf`, `rr_planned`, `note`, `raw_json`, `status`

### `trades` (Execution Ledger)
- `trade_id` (PK)
- `account_id`
- `user_id` (Newly added for O(1) user-scoped filtering)
- `broker_id`, `signal_id`, `source_id`, `origin_kind`
- `symbol`, `side`
- `intent_*` (Entry, SL, TP, Volume)
- `execution_status`, `dispatch_status`, `close_reason`
- `broker_trade_id` (MT5 Ticket)
- Realized Metrics (`entry_exec`, `pnl_realized`, etc.)

---

## 3. Implementation Workflow

### Migration
1. [x] Update PostgreSQL initialization to create v2.1 tables.
2. [x] Add helper functions `mt5GenerateId` and `mt5NormalizeSymbol`.
3. [x] Populate `user_id` into new `trades` records.

### Orchestration Refactor
1. [x] Update `mt5EnqueueSignalFromPayload` to use new IDs and simplified fields.
2. [x] Replace all event-appending calls with `mt5Log(...)`.
3. [x] Verify Dashboard PnL still aggregates correctly from `trades` (using direct `user_id` filter).
4. [x] Purge legacy event tables and migrate historical data to `logs`.

---

## 4. Identity Layer (V2.3)

### Policy
- Core tables now use dual identity:
  - `id` = numeric, internal, high-performance key (`BIGSERIAL`).
  - `sid` = human-facing stable identifier (text), unique.
- Legacy business keys (`signal_id`, `trade_id`, `account_id`, `source_id`, `profile_id`) remain for backward compatibility with EA, webhooks, and older integrations.

### Tables Covered
- `users`, `accounts`, `signals`, `trades`, `sources`, `execution_profiles`.

### Runtime Rules
- UI shows/searches by `sid`.
- Mutations (`update/delete/bulk`) are executed by numeric `id` where available.
- API endpoints resolve identifiers in this order:
  1. numeric `id`
  2. `sid`
  3. legacy key (`trade_id` / `signal_id` / etc.)

### Compatibility Note
- Logs and EA payloads continue to reference legacy IDs.
- Server resolves `id/sid` to legacy keys internally where needed (e.g., trade events/log timeline).
- `users.user_id` remains as a legacy/auth compatibility key for existing foreign keys and session logic.
- `users.sid` is the public/user-facing identifier and must not be UUID-style.
