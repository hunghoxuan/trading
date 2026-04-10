# 0326-18 - Phase C pass 3 (MSS dead-path cleanup)

## Completed
- File changed: `Hung - MSS.pine`.
- Header bumped to `@file-version: 0326-18`.

- Behavior-neutral cleanup in MSS config builders:
  - `get_detection_cfg(int setup)` -> `get_detection_cfg()`
  - `get_ui_cfg(int setup, CORE.Theme th)` -> `get_ui_cfg(CORE.Theme th)`
  - Removed unused setup branches that were never activated (all call sites always passed setup `1`).
  - Updated call sites accordingly.

- Updated status board:
  - `MASTER_PLAN_STATUS.md` now reflects MSS head `0326-18` and Phase C latest checkpoints.

## Why safe
- Removed only unreachable branches and dead parameters.
- Runtime defaults and active behavior remain the same.

## Files to test
1. `src-versions/0326-18/Hung - MSS.pine`
2. `src-versions/0326-17/Hung - SMC.pine`

## Next actions / plan
1. Phase C closeout: final sanity sweep + freeze A/B/C status.
2. Then switch to next major plan item only after your go.
