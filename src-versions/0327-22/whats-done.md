# 0327-22 — Replace hardcode with LocalCfg + rule update

## Completed
- Reworked MSS pass to avoid hardcoded behavior constants.
- Moved previously hardcoded values into `LocalCfg` defaults (no UI Settings added):
  - `liqDollarXPos`
  - `liqDollarYPos`
  - `liqHideOverlapByTf`
  - `liqDollarYOffsetTicks`
  - `liqOverlapTolAtrMult`
  - `liqOverlapScope`
  - `msInvalidMarkerMode`
- Updated all usage sites to read from `localCfg.*`.
- Added collaboration rule:
  - `Avoid introducing hardcoded behavior constants in logic blocks; place configurable defaults in LocalCfg (without exposing new Settings unless requested).`

## Files
- `src/Hung - MSS.pine` (`@file-version: 0327-22`)
- `.agents/workflows/00-collaboration-rules.md`

## Test target
- Use files in: `src-versions/0327-22/`
