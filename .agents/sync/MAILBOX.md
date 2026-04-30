# Mailbox

Active agent relay only.

## Current
- No direct handoff waiting.

## Latest Useful Context
- Canonical UI/API:
  - UI: `https://trade.mozasolution.com`
  - API: `https://trade.mozasolution.com/webhook`
- Deploy script default:
  - `VPS_APP_DIR=/opt/trading`
- Remote smoke defaults:
  - `BASE_URL=https://trade.mozasolution.com/webhook`
  - `UI_URL=https://trade.mozasolution.com`

## Next Good Task
1. Complete dashboard account balance/equity/free-margin cards.
2. Add smoke tests for `/mt5/dashboard/advanced`.
3. Refresh UI/API smoke selectors if stale.
