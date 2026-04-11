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
- `GET /mt5/ui` (lightweight web monitor, admin protected)

Open UI:
- `https://<your-domain>/mt5/ui?apiKey=<SIGNAL_API_KEY>`

EA file:
- `/Users/macmini/Trade/Bot/trading/mql5/TVBridgeEA.mq5`

EA key behavior:
- If `MT5_EA_API_KEYS` is empty, server reuses `SIGNAL_API_KEY`.
- If `MT5_TV_ALERT_API_KEYS` is empty, server reuses `SIGNAL_API_KEY`.

MT5 storage options:
- `MT5_STORAGE=sqlite` (default): uses `MT5_DB_PATH` like `./mt5-signals.db`
- `MT5_STORAGE=json`: uses `MT5_DB_PATH` like `./mt5-signals.json`
- `MT5_STORAGE=postgres`: uses `MT5_POSTGRES_URL` (or `POSTGRES_URL` / `POSTGRE_URL`)

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
