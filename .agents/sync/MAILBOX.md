# MAILBOX

**To:** Any Agent (Codex/Gemini)
**From:** Codex
**Date:** 2026-04-17 14:11 (Europe/Berlin)

## Latest Update (Docs + Runbook Refresh)
- Added canonical AI deploy runbook:
  - `.agents/knowledge/deploy.md` (rewritten)
- Runbook now documents:
  - web surface map (`mozasolution.com`, `www`, `trade`)
  - webhook/API base (`https://trade.mozasolution.com/webhook`)
  - required webhook payload fields (`symbol`, `side`, `price`)
  - server info + script list + updated deploy steps
- Updated script defaults to canonical endpoints:
  - `scripts/deploy_webhook.sh` default `VPS_APP_DIR=/opt/trading`
  - `scripts/test_remote_api.sh` default `BASE_URL=https://trade.mozasolution.com/webhook`
  - `scripts/test_remote_api_default.sh` default `BASE_URL=https://trade.mozasolution.com/webhook`
  - `scripts/test_remote_ui.sh` defaults:
    - `UI_URL=https://trade.mozasolution.com`
    - `BASE_URL=https://trade.mozasolution.com/webhook`
- Updated `webhook/README.md` with canonical route map and payload minimum requirements.

**To:** Any Agent (Codex/Gemini)
**From:** Codex
**Date:** 2026-04-15 17:39 (Europe/Berlin)

## Latest Update (Dashboard v2)
- Implemented and deployed requested dashboard update:
  - removed `Total PnL` / `Avg PnL/Trade` toggle buttons
  - trade scope for KPIs forced to `TP/SL/START/OK`
  - winrate formula forced to `TP/(TP+SL)`
  - first KPI section redesigned to:
    - `Total Trades / Signals`
    - `Wins / Losses`
    - `Total PnL` + winrate (small text)
  - period boxes (`Today/Week/Month/Year`) redesigned to:
    - big: `Total PnL | Total RR`
    - small: `Total trades | total wins | total losses`
  - removed `Summary Tiers` and `Status Breakdown` blocks
  - top tables now direction-aware with columns:
    - `Name | W | L | WR | PnL | RR`
- Versions:
  - `webhook/server.js`: `2026.04.15-04`
  - `webhook-ui/package.json`: `0.1.3`

## Completed In This Session
- FE-02 advanced dashboard is implemented and deployed.
- Backend: added `GET /mt5/dashboard/advanced` with filters (`user_id`, `symbol`, `strategy`, `range`, `metric`), summary tiers, status breakdown, period totals, top winrate tables, and pnl series.
- UI: dashboard wired to advanced endpoint with filter row, metric toggle, tier cards, status breakdown, and top winrate tables.
- Tracker updates: FE-02 removed from sprint and logged in changelog.

## Build / Deploy Versions
- `webhook/server.js`: `SERVER_VERSION = "2026.04.15-03"`
- `webhook-ui/package.json`: `0.1.2`
- FE-02 commit: `37b1cf6`

## Important Context
- Backlog was stale and included already completed FE/BE tasks; cleaned to prevent duplicate rework.
- Remaining dashboard gap moved to backlog: account balance/equity/free-margin integration from `accounts` heartbeat snapshots + smoke tests for advanced endpoint.
- Existing remote Playwright specs may fail due to old selectors/headings (test files lag behind current UI).

## Next Recommended Task
1. Implement `accounts` heartbeat upsert/query completeness in backend.
2. Expose account summary in `/mt5/dashboard/advanced`.
3. Render account balance/equity/free-margin cards in UI.
4. Refresh remote UI/API smoke tests to match current dashboard layout.
