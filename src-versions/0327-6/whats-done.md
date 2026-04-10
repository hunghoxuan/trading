# Version 0327-6 - One-Pass Model-Level Bias Mode

## Done
1. Updated file headers:
- Hung - Core.pine -> @file-version: 0327-6
- Hung - SMC.pine -> @file-version: 0327-6
- Hung - MSS.pine -> @file-version: 0327-6

2. Removed global Bias Mode setting (cleanup):
- Deleted global `Bias Mode` input from `2. Trade Models` in Core/SMC/MSS.
- Deleted global constants `BIAS_MODE_FOLLOW_TREND` / `BIAS_MODE_ALLOW_PULLBACK`.

3. Moved direction preference to model-level logic:
- Core:
  - Added `get_data_entry_model_allow_pullback(int stratId)`.
  - Updated `check_entry_direction_by_mode(..., bool allowPullback)`.
  - `check_entry_model_dynamic(...)` now computes `allowPullback` per strategy id.
- SMC:
  - Added `get_data_entry_model_allow_pullback(string modelKey)`.
  - Updated `check_entry_direction_by_mode(..., bool allowPullback)`.
  - `check_entry_model_dynamic(...)` now computes `allowPullback` per model key.
- MSS:
  - Added `MSS_get_entry_model_allow_pullback(string modelKey)`.
  - Updated `MSS_check_direction_by_mode(..., bool allowPullback)`.
  - `MSS_check_entry_model_dynamic(...)` now computes `allowPullback` per model key.

4. Status sync:
- Updated `MASTER_PLAN_STATUS.md` with one-pass `0327-6` and current src heads.

## Why
- Removes extra global toggle and keeps behavior control where it belongs: per entry model.
- Keeps compile/runtime impact minimal (simple boolean branch in existing gate path).

## Test focus
1. Compile Core/SMC/MSS.
2. Verify settings no longer show global `Bias Mode`.
3. Check pullback-style models still allow tactical direction while trend-following models remain strict.
