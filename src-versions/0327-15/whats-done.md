# 0327-15 — WorkingMaxBars Tune

## Completed
- Set static `WORKING_MAX_BARS = 672` in all indicators:
  - `Hung - Core.pine`
  - `Hung - SMC.pine`
  - `Hung - MSS.pine`
- Kept `max_bars_back = 5000` unchanged in all indicators.
- Ensured header version is consistent:
  - `// @file-version: 0327-15`

## Why
- User requested fixed/static working-zone bars (no dynamic assignment).
- 672 bars is now the unified runtime working zone across files.

## Test target
- Use files in: `src-versions/0327-15/`
