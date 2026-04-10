# Version 0327-5 - Bias Mode Entry Gate

## Done
1. Updated file headers:
- Hung - Core.pine -> @file-version: 0327-5
- Hung - SMC.pine -> @file-version: 0327-5
- Hung - MSS.pine -> @file-version: 0327-5

2. Added new setting in `2. Trade Models` (all 3 indicators):
- `Bias Mode` with options:
  - `Follow Trend` (default): trend first, fallback bias.
  - `Allow Pullback`: bias first, fallback trend.

3. Direction gate wiring:
- Core: updated `check_entry_direction_by_mode(...)` to use Bias Mode for trend-mode checks.
- SMC: updated `check_entry_direction_by_mode(...)` and `allow_direction_with_trend_priority(...)`.
- MSS: updated `MSS_check_direction_by_mode(...)` and `allow_direction_with_trend_priority(...)`.

4. Status sync:
- Updated `MASTER_PLAN_STATUS.md` with one-pass `0327-5` and current src heads.

## Why
- You can now switch between structural confirmation and tactical pullback entries without rewriting per-model logic.

## Test focus
1. Compile Core/SMC/MSS.
2. In each indicator, switch `Bias Mode` between `Follow Trend` and `Allow Pullback`.
3. Verify entry frequency/direction changes as expected when short-bias opposes trend.
