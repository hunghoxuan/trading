# Version 0327-8 - Macro Cleanup (One Package)

## Done
1. Updated file headers:
- Hung - Core.pine -> @file-version: 0327-8
- Hung - SMC.pine -> @file-version: 0327-8
- Hung - MSS.pine -> @file-version: 0327-8

2. Dynamic entry-gate cleanup (Core/SMC/MSS):
- Removed no-op `reasonOk` branch from dynamic checks.
- Standardized pullback preference from model mode fields:
  - `allowPullback = (bias_ltf == 2) or (bias_htf1 == 2) or (bias_htf2 == 2)`.
- Added local helper in each file for that derivation.
- Optimized required-previous-events check with early break on first missing event token.

3. Signature simplification (less coupling):
- Core: `check_entry_model_dynamic(int stratId, string direction, int memDir)`.
- SMC: `check_entry_model_dynamic(string modelKey, string direction, int memDir)`.
- MSS: `MSS_check_entry_model_dynamic(string modelKey, string direction, int memDir)`.

4. Legacy/global settings trimmed:
- Removed dead helper in SMC/MSS: `allow_direction_with_trend_priority(...)`.
- SMC: removed legacy `Dynamic TP/SL` input toggle; stats RR now always uses realized R.
- MSS: removed legacy `Max Active` and `Dynamic TP/SL` input toggles; removed stale chartCfg assignments; stats RR now always uses realized R.

5. Status sync:
- Updated `MASTER_PLAN_STATUS.md` with one-pass `0327-8` and current src heads.

## Why
- Move to a cleaner model-driven gate path, reduce global toggles/noise, and cut branches that add complexity without trading value.

## Test focus
1. Compile Core/SMC/MSS.
2. Verify dynamic direction gating still respects `bias_ltf/htf1/htf2` per model.
3. Verify SMC/MSS settings no longer show removed legacy toggles.
4. Verify dashboard/trade visuals unchanged.
