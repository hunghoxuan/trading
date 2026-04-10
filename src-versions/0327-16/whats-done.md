# 0327-16 — WorkingMaxBars Enforcement Fix (SMC/MSS)

## Completed
- Fixed root cause where working-zone start was effectively frozen from chart first-bar context.
- Switched SMC/MSS working-zone checks to compute from current bar window (`bar_index - WORKING_MAX_BARS`).
- Added per-bar update for working-zone marker line (`workingFirstBarLine`) so it reflects the active window.
- Added hard prune of old objects outside working window:
  - SMC: prune old `chartCtx.zones` and delete visuals.
  - MSS: prune old `chartCtx.levels` and delete line/label visuals.
- Added creation guards so new MSS seeds are skipped when pivot index is outside working zone.
- Updated lookback derivation to always align with current window width.

## Files
- `src/Hung - SMC.pine` (`@file-version: 0327-16`)
- `src/Hung - MSS.pine` (`@file-version: 0327-16`)

## Test target
- Use files in: `src-versions/0327-16/`
