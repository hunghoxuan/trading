# Version 0327-7 - EntryModelDef-Driven Intent

## Done
1. Updated file headers:
- Hung - Core.pine -> @file-version: 0327-7
- Hung - SMC.pine -> @file-version: 0327-7
- Hung - MSS.pine -> @file-version: 0327-7

2. Removed hardcoded pullback mapping helpers:
- Core: removed `get_data_entry_model_allow_pullback(...)`.
- SMC: removed `get_data_entry_model_allow_pullback(...)`.
- MSS: removed `MSS_get_entry_model_allow_pullback(...)`.

3. Unified model intent from `EntryModelDef` fields (all 3 files):
- `allowPullback = (bias_ltf == 2) or (bias_htf1 == 2) or (bias_htf2 == 2)`.
- Dynamic direction gate continues using `check_entry_direction_by_mode(..., allowPullback)`.

4. Status sync:
- Updated `MASTER_PLAN_STATUS.md` with one-pass `0327-7` and current src heads.

## Why
- Behavior now follows model config data directly, not file-local key lists.
- Lower maintenance risk when adding/changing models.

## Test focus
1. Compile Core/SMC/MSS.
2. Verify entry direction behavior still changes correctly per model config (`bias_ltf/htf1/htf2`).
3. Confirm no global Bias Mode setting appears in UI.
