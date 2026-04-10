0330-12

Files:
- Strategy - MSS.pine
- Strategy - SMC.pine

Summary:
- Added strategy realism settings directly in `strategy(...)` for both strategy files:
  - `Process Orders On Close`
  - `Calc On Order Fills`
  - `Calc On Every Tick`
  - `Use Bar Magnifier`
  - `Commission (%)`
  - `Slippage (ticks)`
  - `Limit Fill Assumption (ticks)`
- Switched both strategy files to strategy-only mode with `STRATEGY_ENABLE_VISUALS = false`.
- Disabled trade visual rendering and trade dashboards in both files.
- Guarded obvious MSS line/label draw paths and disabled SMC zone draw calls at the creation path.

Notes:
- This pass is aimed at making strategy scripts focus on data, entries, exits, and backtest realism rather than on-chart visuals.
- No TradingView compile was run locally in this workspace.
