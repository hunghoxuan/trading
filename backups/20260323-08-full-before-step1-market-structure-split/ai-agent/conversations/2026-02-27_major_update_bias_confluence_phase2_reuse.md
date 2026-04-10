# Major Update Summary (2026-02-27)

## Scope
- Extend bias confluence with more optional factors while preserving coding convention and reusability.

## Implemented
1. Added optional bias factors (default OFF):
- EMA20/50 regime (`Use EMA20/50`)
- MACD zero-line regime (`Use MACD Zero`)
- Bollinger walk regime (`Use BB Walk` + `BB Length`, `BB Mult`, `BB Walk Tol`)

2. Reusability refactor:
- Added `get_bias_factor_values(...)` as shared factor-data source.
- Reused by:
  - `get_trend_data(...)` scoring
  - dashboard detailed tooltips (live factor values per timeframe)

3. Scoring extension:
- Expanded max confluence score range to 9.
- Added new bit flags:
  - `64` EMA20/50
  - `128` MACD zero
  - `256` BB walk

4. Tooltip extension:
- Added learning-note constants for new factors.
- Tooltips now include values/status for EMA20/50, MACD zero, BB walk when enabled.

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_185922_v1.2.3_bias_confluence_phase2_pre_refactor`

## Files Updated
- `/Users/macmini/Trade/Bot/Hung Bot/src/_2_ICT-SMC-PA All-in-one2.pine`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/features/BIAS_CONFLUENCE_CHECKBOX_ENGINE.md`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/schedule/ROADMAP.md`
