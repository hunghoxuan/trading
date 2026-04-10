0330-8

Scope
- Revert `Hung - MSS` and `Hung - SMC` back to indicators.
- Create separate strategy files for each.

What Changed
- Restored:
  - `src/Hung - MSS.pine` -> `indicator(...)`
  - `src/Hung - SMC.pine` -> `indicator(...)`
- Created:
  - `src/Strategy - MSS.pine` -> `strategy(...)`
  - `src/Strategy - SMC.pine` -> `strategy(...)`

Separation
- Original `Hung` files:
  - no `tradeOrderIds`
  - no `strategy.entry`
  - no `strategy.exit`
  - no `strategy.cancel`
- New `Strategy` files:
  - keep the earlier Pine order wiring layered on top of the custom trade engine

Version Notes
- `Hung - MSS` bumped to `0330-8`
- `Hung - SMC` bumped to `0330-8`
- `Strategy - MSS` created at `0330-8`
- `Strategy - SMC` created at `0330-8`

Changed Files
- `src/Hung - MSS.pine`
- `src/Hung - SMC.pine`
- `src/Strategy - MSS.pine`
- `src/Strategy - SMC.pine`

Notes
- No TradingView compile was run in this workspace, so this is source-level verified only.
