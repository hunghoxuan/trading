# Version 0327-14 - Bar-Only Working Zone Unification

## Done
1. Updated file headers:
- Hung - Core.pine -> @file-version: 0327-14
- Hung - SMC.pine -> @file-version: 0327-14
- Hung - MSS.pine -> @file-version: 0327-14

2. Unified bar-only working zone (all 3 indicators):
- Added constants:
  - `WORKING_MAX_BARS = 5000`
  - `SAFE_HISTORY_OFFSET = 500`
- Added one-time initialization at first bar:
  - `workingFirstBar = bar_index - WORKING_MAX_BARS` (clamped)
  - vertical marker line drawn at `workingFirstBar`.

3. Indicator cap simplification:
- Removed `max_lines_count`, `max_labels_count`, `max_boxes_count` from indicator declaration.
- Kept unified `max_bars_back = 5000`.

4. Working-zone behavior updates:
- Core draw-window helper now uses fixed working zone.
- SMC/MSS key window/lookback flows updated to fixed-origin expanding zone.

5. Limitation cleanup:
- Removed input bounds (`minval` / `maxval`) in Core/SMC/MSS.
- SMC: removed remaining global active-entry limit dependency and kept per-model cap path.
- SMC: pdarray caps switched to effectively uncapped large values.
- MSS: removed SR source/side cap pruning calls.
- MSS: replaced `EQ_SAFE_HISTORY_OFFSET` usages with unified `SAFE_HISTORY_OFFSET`.

6. Status sync:
- Updated `.agents/MASTER_PLAN_STATUS.md` with one-pass `0327-14` and current src heads.

## Why
- Enforces one dominant runtime limiter (bars working zone) and reduces mixed cap/bound restrictions.

## Test focus
1. Compile Core/SMC/MSS.
2. Verify vertical line appears at initial working-first-bar.
3. Confirm behavior is computed within expanding `[workingFirstBar, current bar]` zone.
4. Check no regressions in entries/dashboard rendering.
