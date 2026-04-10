# Version 0327-9 - Required Events Preset Normalization

## Done
1. Updated file headers:
- Hung - Core.pine -> @file-version: 0327-9
- Hung - SMC.pine -> @file-version: 0327-9
- Hung - MSS.pine -> @file-version: 0327-9

2. Centralized required-events defaults by model key:
- Added `get_data_required_events_preset(...)` in each file.
- Replaced inline literal `required_previous_events` in `process_data_init_strategy_defs()` by preset resolver calls.

3. Preset mapping per indicator:
- Core:
  - `FIB -> BOS`
  - `SWEEP -> SWEEP`
  - others -> empty
- SMC:
  - `BREAK_OUT -> MSS,BOS`
  - `REJECTION -> SWEEP`
  - others -> empty
- MSS:
  - `SWEEP_MSS -> SWEEP,MSS`
  - `SWEEP_MSS_FVG -> SWEEP,MSS,BOS`
  - others -> empty

4. Status sync:
- Updated `MASTER_PLAN_STATUS.md` with one-pass `0327-9` and current src heads.

## Why
- Removes scattered hardcoded event strings and keeps defaults manageable in one place per indicator.

## Test focus
1. Compile Core/SMC/MSS.
2. Verify model defaults still behave the same (no unexpected change in entry preconditions).
3. Confirm no UI regressions.
