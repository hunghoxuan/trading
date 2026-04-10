# Version 0326-28 - SMC LocalCfg Unification (One-pass)

## Done
- Updated `src/Hung - SMC.pine` to `@file-version: 0326-28`.
- One-pass config consolidation in SMC:
  - Removed separate `DetectionCfg`, `LimitationCfg`, `SignalScoreCfg`.
  - Introduced single `LocalCfg` for detection + limitations + score controls.
- Added unified builder:
  - `get_local_cfg(strict, globalLookbackBars, scoreProfileId)`
  - Handles strictness defaults + score profile overrides in one place.
- Refactored all call-sites:
  - `detCfg.*` -> `localCfg.det*`
  - `limCfg.*` -> `localCfg.*`
  - `sigCfg.*` -> `localCfg.score*`
- Kept UI config isolated (`UIConfig`) for visual-only controls.
- Updated `MASTER_PLAN_STATUS.md` SMC head -> `0326-28`.

## Why this step
- Standardizes naming and structure with MSS (`LocalCfg` pattern).
- Reduces config type sprawl and makes future indicator alignment easier.

## Next Actions
1. Compile and test `src-versions/0326-28/Hung - SMC.pine`.
2. Confirm behavior parity on key flows:
   - PD array detection/mitigation.
   - Entry gating and score accumulation.
   - HTF projection filters.
3. If stable, next one-pass can normalize config naming in Core (optional) for full project consistency.
