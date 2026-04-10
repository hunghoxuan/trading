# Version 0326-27 - LocalCfg Unification + Reclass Basis Option

## Done
- Updated `src/Hung - MSS.pine` to `@file-version: 0326-27`.
- One-pass config unification in MSS:
  - Removed separate `DetectionCfg` and `LimitationCfg`.
  - Introduced single `LocalCfg` containing:
    - detection fields (`det*`)
    - limitation fields (`lim*`)
    - MSS reclass fields (`msReclassBars`, `msReclassBasis`)
- Added reclass basis input in UI:
  - `MS reclass basis`: `Close` / `Wick`.
  - wired into `localCfg.msReclassBasis`.
- Added helper `get_data_ms_reclass_invalidated(...)`:
  - `Close` mode:
    - bull event invalidates when `close < level`
    - bear event invalidates when `close > level`
  - `Wick` mode:
    - bull event invalidates when `low < level`
    - bear event invalidates when `high > level`
- Refactored all previous `detCfg.*` and `limCfg.*` call-sites to `localCfg.*`.
- Kept all existing recent behavior:
  - UI-kit marker for `X`
  - append ` x` on invalidated BOS/MSS text
  - liquidity marker `$`
- Updated `MASTER_PLAN_STATUS.md` MSS head -> `0326-27`.

## Notes
- I cannot visually verify chart correctness from here; this pass is code-level and compile-oriented.

## Next Actions
1. Compile and test `src-versions/0326-27/Hung - MSS.pine`.
2. Validate both reclass basis modes:
   - `Close`: invalidation only on close through level.
   - `Wick`: invalidation on wick touch through level.
3. If this config pattern is accepted, next pass can apply the same `LocalCfg` naming/style to SMC for cross-indicator consistency.
