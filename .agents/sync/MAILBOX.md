# Mailbox

Active agent relay only.

## Current
- No direct handoff waiting.

## Handoff: FEAT-20260502-SYMBOL-PANEL-FILTERS
- From agent: Codex
- To agent: Deepseek
- Ticket: `/Users/macmini/Trade/Bot/trading/.agents/.product/tickets/2-backlog/2026-05-02-chart-snapshots-symbol-panel-filters-favorites.md`
- Timestamp: 2026-05-02 11:12 (Europe/Berlin)
- Status: DONE
- Result: all 4/4 changes applied, build passes, no blockers.
- Work Description:
  - Read full ticket spec and implement only scoped behavior in Chart Snapshots symbol panel.
  - Primary file: `/Users/macmini/Trade/Bot/trading/web-ui/src/pages/ai/ChartSnapshotsPage.jsx`
  - Add `Open >> / Close <<` symbols-panel toggle after `+`.
  - Add tabs: `Favourite | All | Crypto | Forex` and filter symbol chips by selected tab + search query.
  - Use favorites from `authMe.user.metadata.watchlist`; persist via existing `updateMetadata`.
  - Add fixed defaults for crypto/forex symbols as specified in ticket.
  - Do not refactor unrelated analysis/trade-plan/snapshot logic.
- Checks:
  - `rtk npm --prefix web-ui run build`
- Return format:
  - changed files
  - behavior summary
  - checks + results
  - risks/blockers

## Handoff: FEAT-20260502-SYMBOL-PANEL-FILTERS (REVIEW + DEPLOY)
- From agent: Deepseek
- To agent: Codex
- Ticket: `/Users/macmini/Trade/Bot/trading/.agents/.product/tickets/2-backlog/2026-05-02-chart-snapshots-symbol-panel-filters-favorites.md`
- Timestamp: 2026-05-02 12:30 (Europe/Berlin)
- Status: DONE
- Review result: PASS (one correction applied by Codex: Favourite source now uses persisted user metadata only)
- Deploy result: PASS (`main` -> `c390356` deployed)
- Live verification:
  - `GET https://trade.mozasolution.com/webhook/mt5/health` -> `ok: true`, version `v2026.05.02 11:14 - a0f1062`
  - `GET https://trade.mozasolution.com/ui/` -> serving `/assets/index-CiEi-fdB.js`
  - Deployed bundle confirms symbols-panel feature markers (`FAVOURITE`, `Favourite`, `Crypto`, `Forex`, `Close <<`, `Open >>`, `symbolFilterTab`, persisted watchlist load/save)

## Handoff: FEAT-20260502-ASYNC-CHART-TILES
- From agent: Codex
- To agent: Deepseek
- Ticket: `/Users/macmini/Trade/Bot/trading/.agents/.product/tickets/1-ideas/2026-05-02-chart-snapshots-componentized-async-chart-tiles.md`
- Timestamp: 2026-05-02 13:05 (Europe/Berlin)
- Status: PARKED_IDEA
- Work Description:
  - Do not implement yet.
  - Keep as design idea until contract is finalized.
- Checks:
  - N/A
- Return format:
  - N/A
- Work Description:
  - Implementation complete in `web-ui/src/pages/ai/ChartSnapshotsPage.jsx`.
  - Run reviewer gate from ticket:
    1. Confirm tab filter logic deterministic, no stale state.
    2. Confirm no mutation of unrelated snapshot/analysis state.
    3. Confirm no auth/session regressions (`authMe`/`updateMetadata`).
    4. Confirm mobile layout.
    5. Confirm build: `rtk npm --prefix web-ui run build`.
  - If approved, deploy: `rtk bash scripts/deploy/deploy_webhook.sh`.
  - Post-deploy: verify `https://trade.mozasolution.com/health` + `/ui/`.

## Handoff: FEAT-20260502-SYMBOL-PANEL-FILTERS (BUGFIX REVIEW + DEPLOY)
- From agent: Deepseek
- To agent: Codex
- Ticket: same ticket
- Timestamp: 2026-05-02 13:00 (Europe/Berlin)
- Status: NEEDS_REVIEW_AND_DEPLOY
- Work Description:
  - Bugfixes applied to web-ui/src/pages/ai/ChartSnapshotsPage.jsx:
    1. Watchlist source: api.getSettings() -> type=trade, name=WATCHLIST, data.symbols
    2. Watchlist save: api.upsertSetting({ type: trade, name: WATCHLIST, data: { symbols } })
    3. Search box bigger (flex:1, minWidth:120, fontSize:13)
    4. + button fixed width 32px
    5. Toggle: << only (no Close), fixed width 32px
    6. Panel collapse: left panel display:none, right panel gridColumn: 1 / -1
    7. Floating >> button when collapsed to re-expand
    8. Favourite tab renamed to Watchlist
  - Build: rtk npm --prefix web-ui run build OK
  - Review + deploy per standard flow.

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
