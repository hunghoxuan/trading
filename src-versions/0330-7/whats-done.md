0330-7

Scope
- Convert `Hung - SMC` and `Hung - MSS` from indicators to Pine strategies.

What Changed
- Switched both files from `indicator(...)` to `strategy(...)`.
- Added aligned `tradeOrderIds` arrays for Pine broker-emulator order ids.
- When a valid custom trade is created, both files now submit:
  - `strategy.entry(..., limit = entry)`
  - `strategy.exit(..., stop = stoploss, limit = takeprofit)`
- When a pending custom trade invalidates or is pruned before entry, the matching Pine order is canceled.

File Notes
- `src/Hung - SMC.pine`
  - Supports both new pending entries and updates to existing pending entries on the same zone.
  - Reissues `strategy.entry/exit` on pending-entry updates so the broker-emulator order stays aligned.
- `src/Hung - MSS.pine`
  - Submits Pine strategy orders when each valid trade plan is created.
  - Cancels pending Pine orders on invalidation and stale pending prune.

Version Notes
- `Hung - SMC` bumped to `0330-7`
- `Hung - MSS` bumped to `0330-7`
- Both now import `KitUI/17`

Changed Files
- `src/Hung - SMC.pine`
- `src/Hung - MSS.pine`

Notes
- No TradingView compile was run in this workspace, so this is source-level verified only.
- Pine strategy fills may not exactly match the custom visual lifecycle because actual fills depend on TradingView's broker emulator.
