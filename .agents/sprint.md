# Active Sprint

## Sprint Goal
Improve signal/trade pipeline clarity and reduce unnecessary runtime cost.

## Currently Doing
- [ ] [2026-04-14 15:00] [Hung - Core] [Author: User] Task: Audit and reduce non-essential gate/score/limitation branches (`P0`).
- [ ] [2026-04-14 15:00] [Kit - SMC] [Author: User] Task: Apply Wave-1 safe cut list from inventory (`P0`).
- [ ] **[TODO: Codex] [Task ID: FE-02]** Advanced Dashboard (Filters, Groupings, Winrate Tables)
  - **Files**: `webhook-ui/src/pages/Dashboard...` (or equivalent)
  - **Expectation**:
    1. Filters: Account, Symbol, Strategy.
    2. Metric Toggle: Switch between Total PnL vs Avg PnL/Trade. Summary Totals (Today, Week, Month, Year).
    3. Summary Tiers: `Open` (New,Locked,Placed,Start), `Wins/Losses` (TP,SL), `Closed` (Reject,Cancel,Fail,Expire).
    4. Data Tables: Render 'Top Winrate' tables (Symbol, Entry Model, Account) displaying Wins, Losses, %, and R-multiple.
  - **Parallelization**: If `entry_model` is missing from the existing API, safely parse it from `metadata` or mock the column locally until the backend finishes BE-01.

## Up Next
(Items pulled from backlog once current tasks finish. Max sprint capacity: 3-5 active items)
