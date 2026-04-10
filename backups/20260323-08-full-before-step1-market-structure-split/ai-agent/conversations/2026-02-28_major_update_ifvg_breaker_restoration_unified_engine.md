# Major Update Summary (2026-02-28)

## Scope
- Restore iFVG and Breaker Block (BB) from legacy `_1` into current unified SMC engine.
- Target file: `/Users/macmini/Trade/Bot/Hung Bot/src/ict_smc [hung].pine`.

## Implemented
1. Added SMC toggles:
   - `iFVG`
   - `BB - Breaker Block`
2. Added labels/constants:
   - `LBL_IFVG`
   - `LBL_BB`
3. Added derived-zone transition helper:
   - `spawn_derived_zone(...)`
4. Restored transitions in unified lifecycle:
   - Broken `FVG` -> spawn opposite-bias `IFVG` (when enabled)
   - Broken `OB` -> spawn opposite-bias `BB` (when enabled)
5. Kept alignment with new architecture:
   - New zones are `SMC_Zone` entries (same type/state fields)
   - Added via `add_active_zone(...)` (ranking + cap enforced)
   - Uses existing dynamic extension + unified mitigation/break checks

## Notes
- This restores zone lifecycle behavior, not legacy signal pipeline entries for `setupType='BB'`.
- BB Walk (bias factor) remains unrelated and unchanged.

## Trace
- Header bumped to `3.5.0`.
