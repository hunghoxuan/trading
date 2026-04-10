# Version 0327-2 - First Cell TF Mapping Consistency

## Done
1. Updated file headers:
- Hung - Core.pine -> @file-version: 0327-2
- Hung - SMC.pine -> @file-version: 0327-2
- Hung - MSS.pine -> @file-version: 0327-2

2. Fixed first-cell inconsistency (Core/SMC/MSS):
- In dashboard bias row, first displayed TF cell (current chart TF) now maps to fixed slots when TF is one of:
  - `15` -> `ctx.dir15` + `ctx.b15`
  - `240` -> `ctx.dir240` + `ctx.b240`
  - `1D/D` -> `ctx.dir1d` + `ctx.b1d`
  - `1W/W` -> `ctx.dir1w` + `ctx.b1w`
- For other TFs (e.g., 1m/5m), it still uses `ctx.dir0` + `ctx.b0`.

3. Status sync:
- Updated `MASTER_PLAN_STATUS.md` with one-pass `0327-2`.

## Why
- Previously, the same TF could use different data paths depending on whether it appeared in first column (current TF) or fixed column, causing visible mismatch.

## Test focus
1. Compile Core/SMC/MSS.
2. Compare SMC/MSS dashboard between 1m, 5m, 15m charts:
- `15m` cell should now be consistent regardless of column position.
- `4h` and `1D` should remain consistent as in 0327-1.
