-- MT5 product schema (Postgres)

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL UNIQUE,
  sid TEXT UNIQUE NOT NULL,
  user_id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  password_salt TEXT,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'User',
  metadata JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL UNIQUE,
  sid TEXT UNIQUE NOT NULL,
  account_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name TEXT,
  balance DOUBLE PRECISION,
  status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signals (
  id BIGSERIAL UNIQUE,
  sid TEXT UNIQUE NOT NULL,
  signal_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'default' REFERENCES users(user_id),
  source TEXT,
  action TEXT NOT NULL,
  symbol TEXT NOT NULL,
  volume DOUBLE PRECISION NOT NULL,
  sl DOUBLE PRECISION,
  tp DOUBLE PRECISION,
  source_tf TEXT,
  chart_tf TEXT,
  rr_planned DOUBLE PRECISION,
  risk_money_planned DOUBLE PRECISION,
  pnl_money_realized DOUBLE PRECISION,
  entry_price_exec DOUBLE PRECISION,
  sl_exec DOUBLE PRECISION,
  tp_exec DOUBLE PRECISION,
  note TEXT,
  raw_json JSONB,
  status TEXT NOT NULL,
  locked_at TIMESTAMPTZ,
  ack_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  ack_status TEXT,
  ack_ticket TEXT,
  ack_error TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_signals_status_created ON signals(status, created_at);
CREATE INDEX IF NOT EXISTS idx_signals_user_created ON signals(user_id, created_at);

CREATE TABLE IF NOT EXISTS signal_events (
  id BIGSERIAL PRIMARY KEY,
  signal_id TEXT NOT NULL REFERENCES signals(signal_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_json JSONB,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_signal_events_signal_time ON signal_events(signal_id, event_time);

-- Canonical status set used by server.js:
-- NEW, LOCKED, OK, START, FAIL, TP, SL, CANCEL, EXPIRED
