# Version 0326-62 - Bias Dashboard Per-TF ShortBias

## Done
1. Updated file headers:
- Hung - Core.pine -> @file-version: 0326-62
- Hung - SMC.pine -> @file-version: 0326-62
- Hung - MSS.pine -> @file-version: 0326-62

2. Bias dashboard logic corrected (Core/SMC/MSS):
- Symbol is now computed per TF cell, not one shared symbol per row.
- Per-TF short bias source:
  - TF0 -> `ctx.b0`
  - 15m -> `ctx.b15`
  - 4h -> `ctx.b240`
  - 1D -> `ctx.b1d`
  - 1W -> `ctx.b1w`

3. Background logic preserved:
- BG still uses trend per TF from `ctx.dirX` via `UI.get_bias_bg_from_trend(...)`.

4. Cleanup:
- Removed obsolete local helper `get_data_bias_local(...)` in Core/SMC/MSS.

5. Status sync:
- Updated `MASTER_PLAN_STATUS.md` with one-pass `0326-62`.

## Why
- Align implementation with dashboard semantics:
  - BG = trend (big direction) per TF.
  - Symbol = short bias (small direction) per TF.

## Test focus
1. Compile all 3 indicators.
2. Check BIAS row: symbol should differ by TF when `ctx.bX` differs.
3. Confirm BG still follows trend (`ctx.dirX`) per TF.

## Next actions
1. If BG mismatch between indicators is still undesired, unify trend source to one canonical TF trend provider (currently each indicator passes its own TFData ledgers into context).
2. Optionally expose a debug mini-row (`dirX/bX`) to verify dashboard semantics quickly during tuning.
