0330-5

Scope
- Convert `Hung - Core` from `indicator()` to `strategy()`.

What Changed
- Replaced the top-level script declaration with `strategy(...)`.
- Added a parallel `tradeOrderIds` array aligned with existing `trades`.
- When Core creates a valid custom trade, it now also submits:
  - `strategy.entry(..., limit = entry)`
  - `strategy.exit(..., stop = stoploss, limit = takeprofit)`
- When the custom trade invalidates before entry touch (`outcome == 2`), the corresponding Pine strategy order is canceled.

Implementation Notes
- This is not a rewrite of the Core trade engine.
- The existing visual/custom lifecycle remains the source for signal generation and invalidation.
- Pine strategy orders are layered on top of that engine so the file can backtest as a strategy.

Changed Files
- `src/Hung - Core.pine`

Notes
- No TradingView compile was run in this workspace, so this is source-level verified only.
- Live Pine backtest behavior may differ slightly from the custom visual lifecycle because Pine strategy fills use TradingView's broker emulator.
