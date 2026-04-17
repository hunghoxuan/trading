# Webhook Bot

Single webhook gateway at `/signal` (and tokenized path `/signal/<token>`).

It can:
- send Telegram notification (optional)
- execute Binance (when `BINANCE_MODE` is set)
- execute cTrader (when `CTRADER_MODE` is set)
- queue MT5 trade for EA pull (when `MT5_ENABLED=true`)

## Config model (simplified)

Removed redundant global switches:
- `EXECUTION_ENABLED` removed
- `EXECUTION_DRY_RUN` removed
- `BINANCE_ENABLED` removed
- `CTRADER_ENABLED` removed

Now:
- Binance ON/OFF is controlled by `BINANCE_MODE` (`paper|live|""`)
- cTrader ON/OFF is controlled by `CTRADER_MODE` (`demo|live|""`)
- MT5 ON/OFF is controlled by `MT5_ENABLED` (`true|false`)

## Setup

```bash
cd /Users/macmini/Trade/Bot/trading/webhook
cp .env.example .env
npm install
npm start
```

Health check:

```bash
curl http://localhost:80/health
```

## Deployment Automation

### Option A: Local deploy script (recommended)

Script file:
- `/Users/macmini/Trade/Bot/trading/scripts/deploy_webhook.sh`

Default behavior:
1. Run local syntax check (`node --check webhook/server.js`)
2. Push local `main` to origin
3. SSH to VPS, pull latest, restart webhook service, verify health endpoints

Step-by-step commands (copy/paste):

```bash
# 1) go to repo root
cd /Users/macmini/Trade/Bot/trading

# 2) optional: review local changes
git status

# 3) run deploy script (push + vps deploy + health checks)
bash scripts/deploy_webhook.sh
```

Config via env vars (advanced):

```bash
BRANCH=main \
PUSH_FIRST=1 \
VPS_HOST=root@139.59.211.192 \
VPS_APP_DIR=/root/trading \
SERVICE_MODE=pm2 \
SERVICE_NAME=webhook \
HEALTH_PORT=80 \
bash scripts/deploy_webhook.sh
```

Notes:
- `SERVICE_MODE` supports `pm2` or `systemd`.
- For systemd, set `SERVICE_NAME` to your unit name.

Manual deploy equivalent (no script):

```bash
# Local machine
cd /Users/macmini/Trade/Bot/trading
git push origin main

# VPS
ssh root@139.59.211.192
cd /root/trading
git pull --ff-only origin main
node --check webhook/server.js
pm2 restart webhook
curl -fsS http://127.0.0.1:80/health
curl -fsS http://127.0.0.1:80/mt5/health
```

Rollback commands:

```bash
ssh root@139.59.211.192
cd /root/trading
git log --oneline -n 5
git checkout <PREVIOUS_COMMIT> -- webhook/server.js webhook/README.md
node --check webhook/server.js
pm2 restart webhook
```

### Option B: GitHub Actions deploy

Workflow file:
- `/Users/macmini/Trade/Bot/trading/.github/workflows/deploy-webhook.yml`

Triggers:
- Manual: `workflow_dispatch`
- Auto on push to `main` when files under `webhook/**` change

Required GitHub repository secrets:
- `VPS_HOST` (example: `139.59.211.192`)
- `VPS_USER` (example: `root`)
- `VPS_SSH_KEY` (private key content)
- `VPS_APP_DIR` (example: `/root/trading`)
- Optional: `VPS_PORT` (defaults to `22`)
- Optional: `VPS_HEALTH_PORT` (defaults to `80`)

Step-by-step (for non-technical users):
1. Open GitHub repository page.
2. Go to `Settings` -> `Secrets and variables` -> `Actions`.
3. Add secrets above one by one.
4. Go to `Actions` tab -> `Deploy Webhook`.
5. Click `Run workflow`.
6. Choose `branch=main`, `service_mode=pm2`, `service_name=webhook`.
7. Click `Run workflow` and wait for green check.
8. Verify:
   - `https://signal.mozasolution.com/health`
   - `https://signal.mozasolution.com/mt5/health`

## MT5 CSV Sync Automation (macOS)

Use these scripts:
- `/Users/macmini/Trade/Bot/trading/scripts/mt5_csv_sync.sh`
- `/Users/macmini/Trade/Bot/trading/scripts/install_mt5_csv_sync_launchd.sh`

What sync does:
- Download `/csv` from server
- Save local copy: `/Users/macmini/Trade/Bot/trading/scripts/tvbridge_signals.csv`
- Overwrite MT5 common file: `.../Terminal/Common/Files/tvbridge_signals.csv`

Run once manually:

```bash
cd /Users/macmini/Trade/Bot/trading
bash scripts/mt5_csv_sync.sh
```

Run with custom env:

```bash
API_KEY="YOUR_SIGNAL_API_KEY" LIMIT=5000 bash /Users/macmini/Trade/Bot/trading/scripts/mt5_csv_sync.sh
```

Install scheduler (every 5 minutes):

```bash
cd /Users/macmini/Trade/Bot/trading
bash scripts/install_mt5_csv_sync_launchd.sh
```

Check scheduler status:

```bash
launchctl print "gui/$(id -u)/com.local.mt5csvsync" | sed -n '1,80p'
tail -n 50 "${TMPDIR:-/tmp}/mt5_csv_sync.log"
tail -n 50 "${TMPDIR:-/tmp}/mt5_csv_sync.err.log"
```

Run scheduler job immediately:

```bash
launchctl kickstart -k "gui/$(id -u)/com.local.mt5csvsync"
```

Disable scheduler:

```bash
launchctl unload ~/Library/LaunchAgents/com.local.mt5csvsync.plist
```

Re-enable scheduler:

```bash
launchctl load ~/Library/LaunchAgents/com.local.mt5csvsync.plist
```

## TradingView webhook

URL:
- Preferred: `https://signal.mozasolution.com/signal/<TV_WEBHOOK_TOKEN>`
- Backward-compatible: `https://signal.mozasolution.com/signal`

Body example:

```json
{
  "strategy": "Hung-SMC",
  "symbol": "BTCUSDT",
  "side": "BUY",
  "timeframe": "1m",
  "price": 68123.5,
  "sl": 67650,
  "tp": 68950,
  "note": "MSS + SMC"
}
```

Header auth alternative (recommended for non-TV clients):
- `x-api-key: <SIGNAL_API_KEY>`

## MT5 EA endpoints (for EA polling)

- `GET /mt5/ea/pull?account=...` (auth via `x-api-key` header)
- `POST /mt5/ea/ack`
- `GET /mt5/health`
- `GET /mt5/trades?limit=200&status=NEW` (admin API, add `apiKey` or `x-api-key`)
- `GET /mt5/dashboard/summary` (admin API; KPI cards + latest unprocessed)
- `GET /mt5/dashboard/pnl-series?period=today|week|month` (admin API)
- `GET /mt5/filters/symbols` (admin API)
- `GET /mt5/trades/search?page=1&pageSize=20&symbol=&status=&range=` (admin API)
- `GET /mt5/trades/:signal_id` (admin API; detail + chart levels + `events[]` timeline)
- `GET /csv?apiKey=...&limit=2000&status=&header=1` (admin API, download EA backtest CSV)
- `GET /mt5/csv?apiKey=...&limit=2000&status=&header=1` (same as `/csv`)
- `GET /mt5/ui` (lightweight web monitor, admin protected)
- `POST /mt5/prune` (admin API, optional body: `{"days":14}`)

Open UI:
- `https://<your-domain>/mt5/ui?apiKey=<SIGNAL_API_KEY>`

EA file:
- `/Users/macmini/Trade/Bot/trading/mql5/TVBridgeEA.mq5`

Backtest CSV columns:
- `timestamp;signal_id;action;symbol;volume;sl;tp;note`
- timestamp format is UTC: `YYYY.MM.DD HH:MM:SS`

EA key behavior:
- If `MT5_EA_API_KEYS` is empty, server reuses `SIGNAL_API_KEY`.
- If `MT5_TV_ALERT_API_KEYS` is empty, server reuses `SIGNAL_API_KEY`.
- If `MT5_TV_WEBHOOK_TOKENS` is empty, server reuses `SIGNAL_API_KEY`.
- Legacy fallback controls:
  - `MT5_AUTH_ALLOW_LEGACY_PAYLOAD_KEY=true|false` (default: `true`)
  - `MT5_AUTH_ALLOW_LEGACY_QUERY_KEY=true|false` (default: `true`)

MT5 storage options:
- `MT5_STORAGE=sqlite` (default): uses `MT5_DB_PATH` like `./mt5-signals.db`
- `MT5_STORAGE=json`: uses `MT5_DB_PATH` like `./mt5-signals.json`
- `MT5_STORAGE=postgres`: uses `MT5_POSTGRES_URL` (or `POSTGRES_URL` / `POSTGRE_URL`)

Postgres config example (`webhook/.env`):

```env
MT5_STORAGE=postgres
MT5_POSTGRES_URL=postgresql://mt5_user:<password>@127.0.0.1:5432/mt5_bridge
```

MT5 Postgres schema (created automatically by `server.js`):

```sql
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  user_name TEXT,
  email TEXT,
  password_salt TEXT,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'User',
  metadata JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
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
  signal_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'default',
  source TEXT,
  action TEXT NOT NULL,
  symbol TEXT NOT NULL,
  volume DOUBLE PRECISION NOT NULL,
  sl DOUBLE PRECISION NULL,
  tp DOUBLE PRECISION NULL,
  source_tf TEXT NULL,
  chart_tf TEXT NULL,
  entry_model TEXT NULL,
  rr_planned DOUBLE PRECISION NULL,
  risk_money_planned DOUBLE PRECISION NULL,
  pnl_money_realized DOUBLE PRECISION NULL,
  entry_price_exec DOUBLE PRECISION NULL,
  sl_exec DOUBLE PRECISION NULL,
  tp_exec DOUBLE PRECISION NULL,
  note TEXT,
  raw_json JSONB,
  status TEXT NOT NULL,
  locked_at TIMESTAMPTZ NULL,
  ack_at TIMESTAMPTZ NULL,
  opened_at TIMESTAMPTZ NULL,
  closed_at TIMESTAMPTZ NULL,
  ack_status TEXT NULL,
  ack_ticket TEXT NULL,
  ack_error TEXT NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_signals_status_created
ON signals(status, created_at);

CREATE TABLE IF NOT EXISTS signal_events (
  id BIGSERIAL PRIMARY KEY,
  signal_id TEXT NOT NULL REFERENCES signals(signal_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_json JSONB,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_signal_events_signal_time
ON signal_events(signal_id, event_time);
```

React UI app (Dashboard + Trades + Trade detail):

```bash
cd /Users/macmini/Trade/Bot/trading/webhook-ui
npm install
VITE_API_BASE=https://signal.mozasolution.com npm run dev
```

Production build:

```bash
cd /Users/macmini/Trade/Bot/trading/webhook-ui
npm run build
```

MT5 prune options:
- `MT5_PRUNE_ENABLED=true|false`
- `MT5_PRUNE_DAYS=14` (delete terminal records older than N days)
- `MT5_PRUNE_INTERVAL_MINUTES=60` (scheduler frequency)
- Prune only affects terminal statuses: `DONE`, `FAILED`, `CANCELED`, `CLOSED_*`

MT5 status lifecycle:
- `NEW`: queued, not pulled yet
- `LOCKED`: already pulled by MT5 EA (dedupe-safe; not pulled again)
- `OK`: acknowledged success / accepted
- `START`: position/order became active
- `FAIL`: execution failure
- `TP`: closed by take profit
- `SL`: closed by stop loss
- `CANCEL`: canceled manually/system
- `EXPIRED`: ignored due to age gate

`/mt5/ea/ack` now accepts status:
- canonical: `OK`, `FAIL`, `START`, `TP`, `SL`, `CANCEL`, `EXPIRED`
- backward compatible aliases: `DONE`, `FAILED`, `CANCELED/CANCELLED`, `CLOSED_TP`, `CLOSED_SL`, `CLOSED_MANUAL`, `CLOSED`

Accounts note:
- `accounts` table exists in DB schema.
- `POST /mt5/ea/heartbeat` requires `account_id` and is intended to upsert account state.
- Current code still contains `TODO` for heartbeat DB upsert, so account records may not auto-update yet.

## Notes

- Telegram is optional. If token/chat id is missing, signal still executes.
- `MT5_DB_PATH=./mt5-signals.db` is a local SQLite file for MT5 queue storage.
- For production with higher throughput, move queue storage to Redis/Postgres if you need horizontal scaling.
- If you use Postgres backend, install dependency: `npm install` (includes `pg`).

## Local Smoke Test (health + db + api + ui)

Run one command from repo root:

```bash
cd /Users/macmini/Trade/Bot/trading
API_KEY=<SIGNAL_API_KEY> \
BASE_URL=http://127.0.0.1:80 \
UI_URL=http://127.0.0.1:5174 \
EXPECT_STORAGE=postgres \
bash scripts/test_local_stack.sh
```

What this script validates:
- `/health`
- `/mt5/health` (and optional storage expectation)
- create signal via `/mt5/tv/webhook`
- pull signal via `/mt5/ea/pull`
- ack signal via `/mt5/ea/ack`
- query trade via `/mt5/trades/:signal_id`
- `/mt5/trades/search`
- `/mt5/dashboard/summary`
- `/mt5/dashboard/pnl-series`
- `/mt5/filters/symbols`
- `/mt5/trades` (legacy endpoint)
- `/csv`
- UI page reachable at `${UI_URL}/dashboard`

Direct Node entrypoint (same test):

```bash
node /Users/macmini/Trade/Bot/trading/scripts/test_local_stack.mjs
```

## Remote UI E2E Test (Playwright)

Run browser-level integration tests against deployed UI/API:

```bash
cd /Users/macmini/Trade/Bot/trading
bash scripts/test_remote_ui.sh
```

What it validates:
- `/ui/dashboard` renders dashboard content (not stuck on loading/error)
- `/ui/trades` renders trade list page (not stuck on loading/error)
- API key and API base are injected from local `webhook/.env` and remote URL defaults

Reports:
- latest: `/Users/macmini/Trade/Bot/trading/test-results/remote-ui-latest.log`
- Playwright HTML report: `/Users/macmini/Trade/Bot/trading/webhook-ui/playwright-report/index.html`

## Remote API Test Framework (lightweight)

For remote-only validation (VPS URL + live API), use the Node built-in test runner:

- test file: `/Users/macmini/Trade/Bot/trading/tests/remote/mt5-remote.test.mjs`
- runner script: `/Users/macmini/Trade/Bot/trading/scripts/test_remote_api.sh`
- report output directory: `/Users/macmini/Trade/Bot/trading/test-results/`

What it tests:
- TradingView webhook push: `POST /mt5/tv/webhook`
- CSV download: `GET /csv`
- EA pull: `GET /mt5/ea/pull` (supports `signal_id` for deterministic pull)

Run from repo root:

```bash
cd /Users/macmini/Trade/Bot/trading
API_KEY="$(sed -n 's/^SIGNAL_API_KEY=//p' webhook/.env | head -n 1)" \
BASE_URL="http://139.59.211.192" \
bash scripts/test_remote_api.sh
```

Report files:
- latest: `/Users/macmini/Trade/Bot/trading/test-results/remote-api-latest.log`
- timestamped: `/Users/macmini/Trade/Bot/trading/test-results/remote-api-YYYYMMDD-HHMMSS.log`
