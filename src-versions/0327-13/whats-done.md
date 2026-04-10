# Version 0327-13 - Final Stabilization (SMC Globals Removed)

## Done
1. Updated file header:
- Hung - SMC.pine -> @file-version: 0327-13
- Hung - Core.pine remains @file-version: 0327-11
- Hung - MSS.pine remains @file-version: 0327-10

2. SMC removed remaining global tuning inputs:
- Removed `Strictness` input.
- Removed `Score Profile` input.

3. SMC simplified config path to stable preset:
- `get_ui_cfg(...)` simplified: no strictness branch.
- `get_data_local_cfg(...)` simplified: no strictness/profile params.
- `get_data_post_touch_keep_max()` simplified: no profile param.
- Updated all call sites accordingly.

4. Status sync + final cleanup-line closeout:
- Updated `MASTER_PLAN_STATUS.md` with one-pass `0327-13`.
- Marked cleanup line status as `COMPLETE`.

## Why
- Removes remaining profile-based runtime drift in SMC and locks to stable model-driven defaults.

## Test focus
1. Compile Core/SMC/MSS.
2. Verify SMC settings no longer show Strictness/Score Profile.
3. Verify SMC behavior remains stable on existing charts.
