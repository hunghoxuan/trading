# Version 0327-10 - Trade Config Group Consolidation

## Done
1. Updated file headers:
- Hung - Core.pine -> @file-version: 0327-10
- Hung - SMC.pine -> @file-version: 0327-10
- Hung - MSS.pine -> @file-version: 0327-10

2. Consolidated trade-config grouping:
- Core: `GROUP_TRADE_CONFIG` changed to `"3. Trade Config"`.
- SMC: `GROUP_TRADE_CONFIG` changed to `"3. Trade Config"`.
- MSS: removed unused `GROUP_TRADE_CONFIG` constant.

3. Status sync:
- Updated `MASTER_PLAN_STATUS.md` with one-pass `0327-10` and current src heads.

## Why
- Removes legacy/deprecated naming in settings for controls that are still active.
- Keeps settings structure easier to scan and maintain.

## Test focus
1. Compile Core/SMC/MSS.
2. Verify Trade Config group appears as `3. Trade Config` in Core/SMC.
3. Confirm MSS settings render normally (no missing/invalid group refs).
