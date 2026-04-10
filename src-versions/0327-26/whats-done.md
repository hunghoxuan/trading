# 0327-26 — Fix debug line x1 too far from current bar

## Issue
- Runtime error on long history:
  - `line.set_x***(): x1 is too far from current bar index`

## Fix
- In both SMC and MSS, debug TF working lines now clamp x-position to safe runtime lookback:
  - `safeLookbackBars = max(SETTINGS.GLOBAL_MAX_LOOKBACK_BARS, WORKING_MAX_BARS)`
  - `currFirstSafe = max(currFirst, bar_index - safeLookbackBars)`
- Applied clamp for both line creation and line updates.

## Files
- `src/Hung - SMC.pine` (`@file-version: 0327-26`)
- `src/Hung - MSS.pine` (`@file-version: 0327-26`)

## Test target
- Use files in: `src-versions/0327-26/`
