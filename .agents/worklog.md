# Worklog: Session Continuity

# Session Log: 2026-04-28 13:20
- **Work Accomplished**:
  - Verified EA bulk closed-history sync is actively posting to `/v2/ea/trades/sync-bulk`.
  - Found production bulk sync failure: server route crashed with `pool is not defined`, so EA requests arrived but could not update VPS rows.
  - Fixed route to use initialized MT5 backend query handle, committed `1e43e8e`, pushed, and deployed.
  - Live-tested bulk endpoint with fake unmatched ticket: HTTP 200, `{ ok: true, updated: 0, unmatched: 1 }`.
  - Confirmed no fresh `pool is not defined` / sync-bulk errors in VPS error log after deploy.
  - Reviewed risk/reward flow: EA calculates accurate risk/reward using MT5 `OrderCalcProfit`; VPS stores and UI displays metadata when EA sends it.
- **Pending Tasks / Backlog**:
  - [ ] Compile/load latest EA build `2026-04-28.1114` or newer in MT5 so terminal-side sync/risk telemetry matches server behavior.
  - [ ] If old trades still show `$0.00`, provide EA Experts logs for ack/sync around those tickets, or backfill approximate risk/reward from MT5 symbol specs.

# Session Log: 2026-04-28 12:45
- **Work Accomplished**:
  - Applied manual production DB correction from MT5 screenshots for tickets `1614606138`, `1614606129`, `1606871045`, `1613165287`, `1614605900`, `1614606086`, `1614606125`, `1613165038`, `1612211029`, `1611966110`, and `1612094065`.
  - Corrected symbol/action/entry/SL/TP/volume/status/PnL/current-price metadata.
  - Created missing current open/pending VPS rows for BTCUSD `1614606129`, XTIUSD `1606871045`, and UK100 `1613165287`.
  - Verified corrected rows in production Postgres.
- **Pending Tasks / Backlog**:
  - [ ] Compile/load EA build `2026-04-28.1030` to prevent future stale EA payloads from fighting manual corrections.

# Session Log: 2026-04-28 12:35
- **Work Accomplished**:
  - Fixed broker ticket matching bug where unmatched MT5 tickets could bind to oldest unresolved trade without symbol validation.
  - EA active sync now sends `symbol` for positions/orders.
  - Server now rejects/quarantines ticket matches when incoming MT5 symbol differs from existing VPS trade symbol.
  - Deployed server/EA build `2026.04.28-1030` / `2026-04-28.1030`.
  - Cleared bad CADJPY ticket assignments for `1614606138` and `1614606129`; both rows reverted to `PENDING` with no broker ticket.
- **Pending Tasks / Backlog**:
  - [ ] Compile/load EA build `2026-04-28.1030` in MT5 so future active sync includes symbol and can match safely.

# Session Log: 2026-04-28 09:58
- **Conversation ID**: current Codex session
- **Work Accomplished**:
  - **EA/VPS Sync Review**:
    - Reviewed EA history sync, active state sync, broker sync reconciliation, and Trades UI PnL display path.
    - Confirmed production DB has two recent closed trades still missing realized PnL: BTCUSD ticket `1611966110` and UK100 ticket `1613165038`.
  - **Sync Hardening Deployed**:
    - Confirmed robust server-side ticket candidate reconciliation is present for position/deal/order ticket matching.
    - Fixed EA active sync JSON construction to escape `signal_id` and avoid ticket truncation by using long ticket formatting.
    - Bumped and deployed builds through production: server/EA `2026.04.28-0753`.
    - Verified production health at `https://trade.mozasolution.com/webhook/mt5/health` returns version `2026.04.28-0753`.
- **Pending Tasks / Backlog**:
  - [ ] User must compile/load the updated `mql5/TVBridgeEA.mq5` build `2026-04-28.0753` in MT5 so the terminal stops sending malformed `/mt5/ea/sync-v2` payloads and resends 7-day closed history.
  - [ ] After the updated EA runs for one history-sync cycle (~5 minutes), verify BTCUSD `1611966110` and UK100 `1613165038` receive `pnl_realized`.
  - [ ] If still missing, collect MT5 Experts log lines for `SYNC`, `sync-bulk`, and tickets `1611966110` / `1613165038`.

# Session Log: 2026-04-27 16:00
- **Conversation ID**: 97a220ca-bbdc-4502-9c38-09672fa77008
- **Work Accomplished**:
  - **UI/Trades Header Hiding**:
    - Updated `SignalDetailCard` to support `hideEditor` flag.
    - Updated `V2TradeDetailPage`, `SignalDetailPage`, and `TradesPage` to hide the "outside" header in favor of the enriched "inside" `PlanHeader`, satisfying the "remove outside header" request.
    - Consolidated trade plan extraction and validation logic in `signalDetailUtils.jsx` for cross-page reuse.
  - **AI Entry Model Standardization**:
    - Created `.agents/knowledge/popular_entry_models.md` with official enums from `server.js`.
    - Created `ai-agent/prompts/signal_generator.prompt` using these enums to guide AI agents.
  - **Build & Deploy**: Bumped versions and synchronized build: `2026.04.27-1851`.
  - **Cleanup & API Refactoring**:
    - Renamed Signals API from `/mt5/trades/search` to `/v2/signals` (with legacy alias).
    - Removed unused `ExecutionV2Page.jsx` and `TradeCard.jsx`.
    - Removed unused legacy endpoints `/mt5/ui` and `/mt5/trades/create`.
  - **Bug Fixes (UI Regressions)**:
    - Fixed PnL data leak in `SignalsPage` by refining `shouldShowPnl` logic.
    - Fixed auto-refresh selection "jumping" in Signals and Trades lists by updating object references.
    - Restored editable Trade form in `TradesPage` and `V2TradeDetailPage`.
    - Standardized note formatting using `formatNote` utility across all surfaces.

- **Pending Tasks / Backlog**:
  - [x] [P1] [AI-Agent/Prompts] Update `ai-agent/prompts/` with official enums from `popular_entry_models.md`.
  - [x] [P1] [UI/Trades] Verify if `V2TradeDetailPage` needs similar "header hiding" logic as Signals.
  - [ ] [P2] [UI/UX] Confirm if "Info" tab should remain the default or if "Chart" should take priority now that fields are visible in "Info".

# Session Log: 2026-04-27 15:30
- **Conversation ID**: af5c0edf-fd39-4919-a84b-36f58455b1ae
- **Work Accomplished**:
  - **SignalDetailCard Restoration**: Restored the 6-slot header layout (Major + Minor rows) to ensure full information density (Status, Vol, PnL, RR, Confidence, Date).
  - **Info Tab Consolidation**: Renamed the "Analysis" tab to "Info" and merged all key metadata fields (Account, Strategy, Entry Model, Ticket) into it.
  - **PlanHeader Refinement**: enriched the "inside" PlanHeader with real-time status, volume, and PnL, satisfying the "remove the outside header" request while keeping context.
  - **Fixed Master-Detail Data Mismatch**: Implemented a `key` prop based on `signal_id` in `SignalsPage.jsx` to force a component reset when switching signals, fixing the bug where old data (e.g., GBPUSD) persisted on new selections (e.g., USDJPY).
  - **Standardized RR**: Prioritized `rr_planned` in the detail header to match the list view and resolve data calculation discrepancies.
  - **Build & Deploy**: Successfully bumped versions and deployed version `2026.04.27-1455` to the production VPS.
  - **Formalized Session Management**: Created `.agents/skills/session-management.md` and updated `.agents/rules.md` (Section 7) to mandate worklog updates for better continuity.

- **Pending Tasks / Backlog**:
  - [ ] [P1] [AI-Agent/Prompts] Update `ai-agent/prompts/` with official enums from `popular_entry_models.md`.
  - [ ] [P1] [UI/Trades] Verify if `V2TradeDetailPage` needs similar "header hiding" logic as Signals (user requested "remove outside header" in screen 1).
  - [ ] [P2] [UI/UX] Confirm if "Info" tab should remain the default or if "Chart" should take priority now that fields are visible in "Info".

- **Key Decisions/Changes**:
  - Hiding the generic top-level header when a trade plan is active to reduce visual clutter.
  - Using a unique `key` on `SignalDetailCard` to prevent stale data in the sidebar detail view.
