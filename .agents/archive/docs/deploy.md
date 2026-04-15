# Deploy Runbook (Git + VPS + MT5)

Last updated: 2026-04-14  
Project root: `/Users/macmini/Trade/Bot/trading`

This is a strict, copy-paste runbook for your stack:
- webhook API (`webhook/server.js`)
- webhook UI (`webhook-ui`)
- MT5 EA (`mql5/TVBridgeEA.mq5`)
- MT5 backtest CSV sync (`scripts/mt5_csv_sync.sh`)

---

## 0) One-time prerequisites

## 0.1 Local tools
```bash
git --version
node -v
npm -v
ssh -V
```

## 0.2 VPS basics
- VPS: `root@139.59.211.192`
- App dir on VPS: `/opt/trading` (or `/root/trading` if you changed it)
- Process manager: `pm2` (default in current scripts/workflow)

Check:
```bash
ssh root@139.59.211.192
pm2 ls
exit
```

## 0.3 GitHub Actions secrets (public repo safe)
In GitHub repo: `Settings -> Secrets and variables -> Actions` add:
- `VPS_HOST` = `139.59.211.192`
- `VPS_USER` = `root`
- `VPS_SSH_KEY` = your private key text (full multiline key)
- `VPS_APP_DIR` = `/opt/trading` (or your real deploy folder)
- `VPS_PORT` = `22`
- `VPS_HEALTH_PORT` = `80` (optional, defaults to 80)

---

## 1) Daily local workflow (code -> commit -> push)

From local project:
```bash
cd /Users/macmini/Trade/Bot/trading
git status
```

Stage + commit + push:
```bash
git add .
git commit -m "feat: your change summary"
git push origin main
```

---

## 2) Deploy webhook to VPS (recommended manual command)

Use the repo script:
```bash
cd /Users/macmini/Trade/Bot/trading
PUSH_FIRST=1 VPS_APP_DIR=/opt/trading bash scripts/deploy_webhook.sh
```

If you already pushed and only want VPS pull+restart:
```bash
cd /Users/macmini/Trade/Bot/trading
PUSH_FIRST=0 VPS_APP_DIR=/opt/trading bash scripts/deploy_webhook.sh
```

If your VPS path is `/root/trading` instead:
```bash
cd /Users/macmini/Trade/Bot/trading
PUSH_FIRST=0 VPS_APP_DIR=/root/trading bash scripts/deploy_webhook.sh
```

---

## 3) Alternative deploy via GitHub Actions

Workflow file: `.github/workflows/deploy-webhook.yml`

How to run manually:
1. Open GitHub repo -> `Actions`
2. Select `Deploy Webhook`
3. `Run workflow`
4. Inputs:
   - `branch`: `main`
   - `service_mode`: `pm2`
   - `service_name`: `webhook`

Auto deploy also triggers on push to `main` when files under `webhook/**` change.

---

## 4) VPS verification after deploy

SSH to VPS:
```bash
ssh root@139.59.211.192
cd /opt/trading
pm2 ls
pm2 logs webhook --lines 80 --nostream
curl -fsS http://127.0.0.1:80/health
curl -fsS http://127.0.0.1:80/mt5/health
exit
```

Public checks from local:
```bash
curl -sS http://139.59.211.192/health
curl -sS http://139.59.211.192/mt5/health
curl -sS http://139.59.211.192/ui/dashboard | head
```

---

## 5) Run integration tests against remote server

Main full stack check:
```bash
cd /Users/macmini/Trade/Bot/trading
bash scripts/test_server.sh
```

Other useful checks:
```bash
cd /Users/macmini/Trade/Bot/trading
bash scripts/test_remote_api_default.sh
bash scripts/test_remote_ui.sh
bash scripts/test_webhook_push_random.sh
```

---

## 6) MT5 CSV sync (backtest file update)

Manual sync:
```bash
cd /Users/macmini/Trade/Bot/trading
chmod +x scripts/mt5_csv_sync.sh
bash scripts/mt5_csv_sync.sh
```

This script writes CSV to both:
1. `/Users/macmini/Trade/Bot/trading/scripts/tvbridge_signals.csv`
2. MT5 Common Files path under Wine:
   `/Users/macmini/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/users/crossover/AppData/Roaming/MetaQuotes/Terminal/Common/Files/tvbridge_signals.csv`

Install auto sync every 5 min (launchd):
```bash
cd /Users/macmini/Trade/Bot/trading
chmod +x scripts/install_mt5_csv_sync_launchd.sh
/Users/macmini/Trade/Bot/trading/scripts/install_mt5_csv_sync_launchd.sh
```

Check launchd job:
```bash
launchctl print gui/$(id -u)/com.local.mt5csvsync | sed -n '1,80p'
```

---

## 7) MT5 EA deploy/update steps (manual in MetaEditor/MT5)

## 7.1 Compile EA
1. Open MetaEditor.
2. Open `TVBridgeEA.mq5`.
3. Press `F7` (Compile).
4. Ensure `0 errors` in Toolbox.

## 7.2 Attach / reattach EA
1. MT5 -> open chart (any symbol/timeframe).
2. Navigator -> Expert Advisors -> drag `TVBridgeEA` to chart.
3. In EA Inputs set:
   - `InpServerBaseUrl = http://signal.mozasolution.com`
   - `InpEaApiKey = <your key>`
   - `InpPollSeconds = 2` (or your desired)
   - `InpIgnoreUnknownSymbol = true`
   - `InpIgnoreDuplicateId = true`
4. Common tab:
   - Allow algo trading.
   - Allow WebRequest URL if needed.
5. Top toolbar `Algo Trading` must be green.

## 7.3 Backtest mode
1. Strategy Tester -> `Single test` (not Optimization).
2. EA input: `InpReplayFromFile = true`
3. CSV file in MT5 Common/Files.
4. For old historical signals: set `InpIgnoreOlderSec = 0`.

---

## 8) Endpoint map (current)

TradingView/webhook push (recommended):
- `http://signal.mozasolution.com/mt5/tv/webhook`

Legacy compatible:
- `http://signal.mozasolution.com/signal`

EA pull:
- `http://signal.mozasolution.com/mt5/ea/pull`

EA ack/update:
- `http://signal.mozasolution.com/mt5/ea/ack`

Backtest CSV:
- `http://signal.mozasolution.com/csv?apiKey=<API_KEY>&limit=5000`

UI:
- `http://signal.mozasolution.com/ui/dashboard`
- `http://139.59.211.192/ui/dashboard` (direct IP)

---

## 9) Fast rollback

On VPS:
```bash
ssh root@139.59.211.192
cd /opt/trading
git log --oneline -n 5
git reset --hard <previous_commit_sha>
pm2 restart webhook
curl -fsS http://127.0.0.1:80/health
exit
```

---

## 10) Common issues and quick fix

1. `retcode=10027 auto trading disabled by client`
- Turn on MT5 toolbar `Algo Trading`.
- Ensure EA is attached and allowed to trade.
- Re-login trading account (not investor/read-only).

2. `retcode=10016 invalid stops`
- Increase EA stop buffer (`InpStopBufferPts`).
- Broker stop/freeze levels too tight for requested SL/TP.

3. `retcode=10014 invalid volume`
- Symbol volume min/step mismatch (EA now normalizes volume).

4. UI timeout in browser but not in others
- Check DNS/HTTPS-upgrade behavior in that browser.
- Test direct IP: `http://139.59.211.192/ui/dashboard`.

