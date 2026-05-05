# Handoff: FEAT-20260505-DB-CACHE-UI (REVIEW + DEPLOY)
- From agent: Deepseek
- To agent: Codex
- Ticket: `/Users/macmini/Trade/Bot/trading/.agents/.product/tickets/2-backlog/2026-05-05-db-cache-enhancements.md`
- Timestamp: 2026-05-05 05:00 (UTC)
- Status: NEEDS_REVIEW_AND_DEPLOY
- Work Description:
  - Review all changes in `webhook/server.js`, `web-ui/src/api.js`, `web-ui/src/pages/system/CachePage.jsx`, `web-ui/src/pages/system/DatabasePage.jsx`.
  - Verify backend: `node --check webhook/server.js`
  - Verify UI: `npm --prefix web-ui run build`
  - Deploy: `bash scripts/deploy/deploy_webhook.sh`
  - Post-deploy smoke: visit `/system/cache` (search, symbol filter, time ago + expiry), `/system/db` (column sorting, visibility toggles, edit+save).
- Checks: `rtk node --check webhook/server.js`, `rtk npm --prefix web-ui run build`

# Handoff: SID-First Architecture & Broker Integration
Date: 2026-05-05 (Updated)

## 1. Summary of Changes (Previous Session)
Successfully migrated to **SID-first identification architecture**.

### Identification Refactor
- **SID Unified**: 9-char, time-sortable, Base36 SID (e.g., `D1AA65EDA`) — no prefix.
- **Broker Identity**: Label = `{Source}_{EntryModel}`, Comment = `sid`.
- **Sync Logic**: Primary lookup switched from `ticket` to `sid`.

### Database & Account Health
- **Trade Columns**: `broker_pips`, `broker_lots`, `broker_commission`, `broker_swap`, `broker_volume`.
- **Account Columns**: `balance`, `equity`, `margin`, `free_margin`, `leverage`, `broker_name` on `user_accounts`.
- **Manual Discovery**: Auto-adopt unrecognized broker positions as `source_id = [BrokerName]`.

## 2. Bugs Fixed This Session
- [x] `mt5GenerateId("SIG")` → `mt5GenerateTimeSid()` — new signals no longer get `SIG_` prefix.
- [x] Discovery INSERT used non-existent `source` column → fixed to `source_id`.
- [x] Discovery INSERT used `userId` (undefined) → fixed to `uid` (correct scope).
- [x] Migrated 23 trades + 30 signals from `SIG_...` to clean 9-char SIDs.

## 3. Current State
- **Backend**: Deployed `v2026.05.05 04:53 - b1ae8f7` (efa3f99). Health: ✅
- **DB**: All SIDs migrated. Balance/equity/margin columns populated (17764/17752/925).
- **Bridge**: `TVBridge_CTrader.cs` updated locally — needs recompile in cTrader platform.
- **broker_name**: Empty — will populate on next bridge sync cycle with new compiled bridge.

## 4. Next Steps
- [ ] **Recompile cTrader bridge** on broker platform with latest `TVBridge_CTrader.cs`. (USER action)
- [ ] Verify `broker_name` populates after recompile + sync.
- [ ] Open a manual trade in cTrader → verify Auto-Adopt creates a record with `source_id = [BrokerName]`.
- [ ] Verify `ClosePositions()` in bridge handles new-style labels (currently only matches MagicNumber).
- [ ] Evaluate phasing out `trade_id` and `signal_id` columns after grace period.

## 5. Context for New Thread
"Resuming SID-First Architecture. All backend bugs fixed and deployed (v2026.05.05 04:53). Read .agents/sync/MAILBOX.md. Focus: recompile cTrader bridge, verify manual discovery, and fix ClosePositions to match new-style labels."
