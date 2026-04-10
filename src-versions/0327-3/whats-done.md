# Version 0327-3 - Bias Arrow Color By Direction

## Done
1. Updated file headers:
- Hung - Core.pine -> @file-version: 0327-3
- Hung - SMC.pine -> @file-version: 0327-3
- Hung - MSS.pine -> @file-version: 0327-3

2. Dashboard arrow/text color update (Core/SMC/MSS):
- Per-cell text color now follows shortBias direction:
  - bullish (`+1`) -> `THEME.COLOR_BULLISH`
  - bearish (`-1`) -> `THEME.COLOR_BEARISH`
  - neutral (`0`) -> `THEME.COLOR_UI_FG`

3. Status sync:
- Updated `MASTER_PLAN_STATUS.md` with one-pass `0327-3`.

## Why
- Improve readability and make tactical bias direction obvious without changing core trend/bias calculations.

## Test focus
1. Compile Core/SMC/MSS.
2. Verify arrows in BIAS row are color-coded by direction in all visible TF cells.
3. Confirm no regression in previous consistency fixes (0327-1/0327-2).
