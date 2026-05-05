# Handoff: SID-First Architecture & Broker Integration
Date: 2026-05-05

## 1. Summary of Changes
Successfully migrated the system to a **SID-first identification architecture** to align the VPS and Broker environments.

### Identification Refactor
- **SID Unified**: Every trade/signal now uses a 9-character, time-sortable, Base36 SID (e.g., `M0M1M2A1B`) as its primary key.
- **Broker Identity**: 
    - `Label`: Set to `{Source}_{EntryModel}` for instant recognition in cTrader.
    - `Comment`: Set to the `sid` for 1:1 mapping during heartbeat sync.
- **Sync Logic**: Switched primary lookup from `ticket` to `sid` in `brokerSyncV2`.

### Database & Account Health
- **Dedicated Columns**: Added `broker_pips`, `broker_lots`, `broker_commission`, `broker_swap`, and `broker_volume` to `trades` table.
- **Account Columns**: Added `balance`, `equity`, `margin`, `free_margin`, `leverage`, and `broker_name` to `user_accounts` table.
- **Manual Discovery**: Implemented "Auto-Adopt" logic. Unrecognized positions in the broker heartbeat are now automatically created in the VPS with `source = [BrokerName]`.

### Workflow Enforcement
- Added **Workflow Laws** to `.agents/rules.md`:
    - "Documentation First": Update Feature/Ticket docs before coding.
    - "Clean Hand-off": Detailed status update at task completion.

## 2. Current State
- **Backend**: `server.js` is fully refactored to use new columns and SID logic.
- **Bridge**: `TVBridge_CTrader.cs` is updated to send comprehensive metadata and use new labeling.
- **UI**: `TradesPage.jsx` prioritizes new DB columns for display with legacy fallbacks.
- **Deployment**: Live on VPS as of version `v2026.05.05 04:45 - b1ae8f7`.

## 3. Next Steps
- [ ] Monitor discovery logic for a few manual trades to ensure `source` is correctly parsed.
- [ ] Verify that `accounts` table metrics are being updated in real-time on the dashboard.
- [ ] Evaluate if `trade_id` and `signal_id` columns can be phased out/archived after a grace period.

## 4. Context for New Thread
Copy-paste this prompt to the next AI agent:
"Resuming work on the SID-First Trading Architecture. All major backend, bridge, and database refactors are complete and deployed (v2026.05.05 04:45). Read .agents/sync/MAILBOX.md for the full status. Your next task is to verify the manual discovery logic and monitor the real-time account metric updates."
