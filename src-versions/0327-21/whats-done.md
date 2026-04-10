# 0327-21 — MSS remove specific settings + rule update

## Completed
- Removed these MSS user settings from `1. UI Config`:
  - `$ X`
  - `Y`
  - `TF Priority`
  - `$ Y ticks`
  - `Overlap ATR`
  - `Overlap Scope`
  - `MS reclass bars`
  - `Basis`
  - `X mode`
- Replaced them with fixed constants (same defaults as before), so behavior stays stable:
  - `LIQ_DOLLAR_X_POS = "Right"`
  - `LIQ_DOLLAR_Y_POS = "Center"`
  - `LIQ_HIDE_OVERLAP_BY_TF = true`
  - `LIQ_DOLLAR_Y_OFFSET_TICKS = 4.0`
  - `LIQ_OVERLAP_TOL_ATR_MULT = 0.03`
  - `LIQ_OVERLAP_SCOPE = "Dollar Only"`
  - `MS_INVALID_MARKER_MODE = "Marker"`
- Reclass controls now use local defaults in `LocalCfg` (no UI knobs).
- Added collaboration rule:
  - `Do not add new user-facing Settings/inputs unless the user explicitly asks for them.`

## Files
- `src/Hung - MSS.pine` (`@file-version: 0327-21`)
- `.agents/workflows/00-collaboration-rules.md`

## Test target
- Use files in: `src-versions/0327-21/`
