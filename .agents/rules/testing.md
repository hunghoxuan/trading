# Testing Rules

- Run checks matching touched code.
- Backend:
  - `node --check webhook/server.js`
- UI:
  - `npm --prefix web-ui run build`
- Remote API:
  - `BASE_URL=https://trade.mozasolution.com/webhook bash scripts/test_remote_api_default.sh`
- Remote UI:
  - `UI_URL=https://trade.mozasolution.com BASE_URL=https://trade.mozasolution.com/webhook bash scripts/test_remote_ui.sh`
- Report actual commands and results.
- If skipped, say why.

