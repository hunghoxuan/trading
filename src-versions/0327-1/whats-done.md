# Version 0327-1 - Fixed-TF Trend Source (Dashboard Context)

## Done
1. Updated KIT header:
- Kit - Core.pine -> @kit-version: 4

2. Kept `get_htf_pair()` unchanged.

3. Fixed dashboard trend source drift across chart TF changes:
- In `CORE.get_data_context(...)`, trend slots now use fixed TF trend providers:
  - `ctx.dir15 := get_ms_trend_dir_fixed_tf("15")`
  - `ctx.dir240 := get_ms_trend_dir_fixed_tf("240")`
  - `ctx.dir1d := get_ms_trend_dir_fixed_tf("1D")`
  - `ctx.dir1w := get_ms_trend_dir_fixed_tf("1W")`
- Added helpers:
  - `get_ms_trend_dir_fixed_expr()`
  - `get_ms_trend_dir_fixed_tf(string tfName)`

4. Status sync:
- Updated `MASTER_PLAN_STATUS.md` with one-pass `0327-1` and kit head.

## Why
- Solve inconsistency where the same TF cell (e.g., 4H) changed BG when switching chart TF due to dynamic htf1/htf2 remapping.
- Keep dashboard fixed-cell semantics stable without changing `get_htf_pair()` globally.

## Test focus (morning)
1. Compile all indicators that import `Kit - Core`.
2. On SMC/MSS/CORE, compare dashboard BG for 15/4H/1D while switching chart TF (e.g., 5m <-> 15m):
- 4H and 1D BG should stay consistent for same bar/time.
3. Verify short-bias symbols still per-TF (`ctx.b15/b240/b1d`).

## Next actions (auto)
1. If any remaining mismatch appears, add a temporary debug row showing `dir15/dir240/dir1d` values to confirm data path.
2. After stability check, optionally migrate fixed-TF trend helper to other modules that rely on dynamic slot trend if you want full-stack consistency.
