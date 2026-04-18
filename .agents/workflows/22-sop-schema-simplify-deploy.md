# 22 - SOP: Schema Simplify + Deploy (MT5 V2)

1. Implement schema + API + UI simplification changes locally.
2. Run local checks:
   - `node --check webhook/server.js`
   - `npm --prefix web-ui run build`
3. Deploy to VPS:
   - `PUSH_FIRST=1 VPS_APP_DIR=/opt/trading bash scripts/deploy_webhook.sh`
4. Run one-time DB backfill on VPS:
   - `cd /opt/trading && node scripts/mt5_v2_simple_backfill.js`
5. Run remote smoke tests:
   - `BASE_URL=https://trade.mozasolution.com/webhook bash scripts/test_remote_api_default.sh`
   - `UI_URL=https://trade.mozasolution.com BASE_URL=https://trade.mozasolution.com/webhook bash scripts/test_remote_ui.sh`
6. Verify live schema via `information_schema` and confirm removed tables/columns.
