# Webhook Bot

Single webhook gateway at `/signal`.

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
- `https://signal.mozasolution.com/signal`

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
  "note": "MSS + SMC",
  "apiKey": "<SIGNAL_API_KEY>"
}
```

## MT5 EA endpoints (for EA polling)

- `GET /mt5/ea/pull?api_key=...&account=...`
- `POST /mt5/ea/ack`
- `GET /mt5/health`
- `GET /mt5/trades?limit=200&status=NEW` (admin API, add `apiKey` or `x-api-key`)
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

MT5 storage options:
- `MT5_STORAGE=sqlite` (default): uses `MT5_DB_PATH` like `./mt5-signals.db`
- `MT5_STORAGE=json`: uses `MT5_DB_PATH` like `./mt5-signals.json`
- `MT5_STORAGE=postgres`: uses `MT5_POSTGRES_URL` (or `POSTGRES_URL` / `POSTGRE_URL`)

MT5 prune options:
- `MT5_PRUNE_ENABLED=true|false`
- `MT5_PRUNE_DAYS=14` (delete terminal records older than N days)
- `MT5_PRUNE_INTERVAL_MINUTES=60` (scheduler frequency)
- Prune only affects terminal statuses: `DONE`, `FAILED`, `CANCELED`, `CLOSED_*`

MT5 status lifecycle:
- `NEW`: queued, not pulled yet
- `LOCKED`: already pulled by MT5 EA (dedupe-safe; not pulled again)
- `DONE`: EA acknowledged success
- `FAILED`: EA acknowledged failure
- `CANCELED`: manually canceled
- `CLOSED_TP`: trade closed by take profit
- `CLOSED_SL`: trade closed by stop loss
- `CLOSED_MANUAL` / `CLOSED`: trade closed manually/other

`/mt5/ea/ack` now accepts status:
- `OK`, `FAIL`, `CANCELED`, `CLOSED_TP`, `CLOSED_SL`, `CLOSED_MANUAL`, `CLOSED`

## Notes

- Telegram is optional. If token/chat id is missing, signal still executes.
- `MT5_DB_PATH=./mt5-signals.db` is a local SQLite file for MT5 queue storage.
- For production with higher throughput, move queue storage to Redis/Postgres if you need horizontal scaling.
- If you use Postgres backend, install dependency: `npm install` (includes `pg`).
