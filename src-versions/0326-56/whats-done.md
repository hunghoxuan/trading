# Version 0326-56 - Dashboard indent hotfixes (Core/SMC/MSS)

## Completed
- Fixed Pine local-block indentation errors in dashboard draw methods:
  - Core: `if showDash` block indentation fixed.
  - SMC: `draw_data_bias_row_under_trades_local(...)` re-indented inside `draw_data_trades_dashboard()`.
  - MSS: `draw_data_bias_row_under_trades_local(...)` re-indented inside `draw_data_trades_dashboard()`.
- Scope is syntax-only; no strategy logic change.

## Files changed
- `src/Hung - Core.pine`
- `src/Hung - SMC.pine`
- `src/Hung - MSS.pine`
- `MASTER_PLAN_STATUS.md`

## Test now
- `src-versions/0326-56/Hung - Core.pine`
- `src-versions/0326-56/Hung - SMC.pine`
- `src-versions/0326-56/Hung - MSS.pine`
