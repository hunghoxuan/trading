# Version 0326-55 - Move Shared UI Helpers To KIT

## Completed
- Moved shared-identical helpers from local files to KIT UI:
  - `UI.get_bias_bg_from_trend(int trendDir, CORE.Theme theme)`
  - `UI.get_bias_symbol(int biasDir, CORE.Const c)`
  - `UI.collect_dashboard_trades(array<CORE.Trade> src, array<CORE.Trade> out, bool showPending, bool showStart, bool showTp, bool showSl, int lookbackBars, CORE.Const c)`
- Updated Core/SMC/MSS to call KIT methods directly (`UI.*`) with explicit `THEME/CONST` args.
- Removed local duplicate definitions of the 3 helpers in all indicator files.
- Kept local-only bias logic untouched (`get_data_bias_local`) per indicator as agreed.

## Files changed
- `src/Kit - UI.pine`
- `src/Hung - Core.pine`
- `src/Hung - SMC.pine`
- `src/Hung - MSS.pine`
- `MASTER_PLAN_STATUS.md`

## Next actions
1. Compile-check this version on all 3 indicators (Core/SMC/MSS) because helper signatures changed.
2. If stable, remove deprecated global `signalEntryMode` inputs in SMC/MSS.
3. Continue schema-first cleanup of remaining global Trade Config knobs.

## Test now
- `src-versions/0326-55/Hung - Core.pine`
- `src-versions/0326-55/Hung - SMC.pine`
- `src-versions/0326-55/Hung - MSS.pine`
- `src-versions/0326-55/Kit - UI.pine`
