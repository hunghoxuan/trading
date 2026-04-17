-- Execution Hub V2 schema contract (Postgres)
-- Date: 2026-04-17
-- Purpose: design-lock DDL for migration and implementation.

-- Extension for case-insensitive unique names (optional but recommended).
CREATE EXTENSION IF NOT EXISTS citext;

-- 1) Sources: upstream signal producers.
CREATE TABLE IF NOT EXISTS sources (
  source_id TEXT PRIMARY KEY,
  name CITEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('tv', 'api', 'manual', 'bot')),
  auth_mode TEXT NOT NULL CHECK (auth_mode IN ('token', 'api_key', 'signature', 'none')),
  auth_secret_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_kind_active ON sources(kind, is_active);

-- 2) Brokers: execution runtime identities (EA/API/manual).
CREATE TABLE IF NOT EXISTS brokers (
  broker_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  broker_type TEXT NOT NULL CHECK (broker_type IN ('mt5_ea', 'api_bot', 'manual')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brokers_active_seen ON brokers(is_active, last_seen_at);

-- 3) Accounts upgrade: account-level API key and optional broker binding.
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS broker_id TEXT REFERENCES brokers(broker_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS api_key_hash TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS api_key_last4 TEXT,
  ADD COLUMN IF NOT EXISTS api_key_rotated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_ids_cache JSONB;

CREATE INDEX IF NOT EXISTS idx_accounts_broker ON accounts(broker_id);
CREATE INDEX IF NOT EXISTS idx_accounts_api_key_hash ON accounts(api_key_hash);

-- 4) Account subscriptions: many sources per account.
CREATE TABLE IF NOT EXISTS account_sources (
  account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(source_id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  symbol_allowlist JSONB,
  strategy_allowlist JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_account_sources_source_active ON account_sources(source_id, is_active);
CREATE INDEX IF NOT EXISTS idx_account_sources_account_active ON account_sources(account_id, is_active);

-- 5) Immutable signal feed v2.
ALTER TABLE signals
  ADD COLUMN IF NOT EXISTS source_id TEXT REFERENCES sources(source_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_signal_id TEXT,
  ADD COLUMN IF NOT EXISTS side TEXT,
  ADD COLUMN IF NOT EXISTS entry DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS sl_v2 DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS tp_v2 DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS signal_tf TEXT,
  ADD COLUMN IF NOT EXISTS chart_tf_v2 TEXT,
  ADD COLUMN IF NOT EXISTS payload_json JSONB,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;

-- Legacy columns remain during migration.
CREATE INDEX IF NOT EXISTS idx_signals_source_received ON signals(source_id, received_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_signals_source_external
  ON signals(source_id, external_signal_id)
  WHERE external_signal_id IS NOT NULL;

-- 6) Trades: core execution ledger.
CREATE TABLE IF NOT EXISTS trades (
  trade_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  broker_id TEXT REFERENCES brokers(broker_id) ON DELETE SET NULL,
  signal_id TEXT REFERENCES signals(signal_id) ON DELETE SET NULL,
  source_id TEXT REFERENCES sources(source_id) ON DELETE SET NULL,
  origin_kind TEXT NOT NULL CHECK (origin_kind IN ('SIGNAL', 'BROKER')),

  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  intent_entry DOUBLE PRECISION,
  intent_sl DOUBLE PRECISION,
  intent_tp DOUBLE PRECISION,
  intent_volume DOUBLE PRECISION,
  intent_note TEXT,

  dispatch_status TEXT NOT NULL DEFAULT 'NEW'
    CHECK (dispatch_status IN ('NEW', 'LEASED', 'CONSUMED')),
  lease_token TEXT,
  lease_expires_at TIMESTAMPTZ,
  pulled_at TIMESTAMPTZ,

  execution_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (execution_status IN ('PENDING', 'OPEN', 'CLOSED', 'REJECTED')),
  close_reason TEXT
    CHECK (close_reason IN ('TP', 'SL', 'MANUAL', 'CANCEL', 'EXPIRED', 'FAIL')),
  broker_trade_id TEXT,
  broker_order_id TEXT,
  entry_exec DOUBLE PRECISION,
  sl_exec DOUBLE PRECISION,
  tp_exec DOUBLE PRECISION,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  pnl_realized DOUBLE PRECISION,
  error_code TEXT,
  error_message TEXT,

  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_trades_account_signal
  ON trades(account_id, signal_id)
  WHERE signal_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_trades_account_broker_trade
  ON trades(account_id, broker_trade_id)
  WHERE broker_trade_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trades_dispatch_queue
  ON trades(account_id, dispatch_status, created_at);

CREATE INDEX IF NOT EXISTS idx_trades_execution_state
  ON trades(account_id, execution_status, updated_at);

CREATE INDEX IF NOT EXISTS idx_trades_source_created
  ON trades(source_id, created_at DESC);

-- 7) Trade events: append-only timeline.
CREATE TABLE IF NOT EXISTS trade_events (
  event_id BIGSERIAL PRIMARY KEY,
  trade_id TEXT NOT NULL REFERENCES trades(trade_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  idempotency_key TEXT,
  payload_json JSONB,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_trade_events_trade_time ON trade_events(trade_id, event_time);
CREATE UNIQUE INDEX IF NOT EXISTS uq_trade_events_idem ON trade_events(trade_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 8) Backward compatibility note:
-- user_api_keys is retained only until cutover is complete.
-- It will be dropped in Phase 5.
