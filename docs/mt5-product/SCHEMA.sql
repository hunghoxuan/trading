-- MT5 product schema (Postgres)

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  user_name TEXT,
  email TEXT,
  password_hash TEXT,
  balance_start DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signals (
  signal_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  source TEXT,
  action TEXT NOT NULL,
  symbol TEXT NOT NULL,
  volume DOUBLE PRECISION NOT NULL,
  sl DOUBLE PRECISION,
  tp DOUBLE PRECISION,
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
  ack_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_signals_status_created ON signals(status, created_at);
CREATE INDEX IF NOT EXISTS idx_signals_user_created ON signals(user_id, created_at);

CREATE TABLE IF NOT EXISTS signal_events (
  id BIGSERIAL PRIMARY KEY,
  signal_id TEXT NOT NULL REFERENCES signals(signal_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_signal_events_signal_time ON signal_events(signal_id, event_time);
