# Version 0326-54 - Local Helper Prefix Hygiene

## Completed
- Applied new naming rule:
  - If helper logic is not identical across all 3 indicators, it is treated as local helper (not KIT-copied helper).
- Renamed non-shared prefixed helpers:
  - Core: removed local-only `CORE_*`/`UI_draw_*` prefixes.
  - SMC: removed local-only `SMC_*`/`UI_draw_*` prefixes.
  - MSS: renamed local bias + bias-row draw helpers to local names.
- Kept `UI_*` only for shared-identical helpers across all 3 files:
  - `UI_get_bias_bg_from_trend`
  - `UI_get_bias_symbol`
  - `UI_collect_dashboard_trades`
- Verified KIT status:
  - No `get_bias_data` exists in KIT (`src/Kit - Core.pine`, `src/Kit - UI.pine`), so no KIT cleanup needed for that item.

## Files changed
- `src/Hung - Core.pine`
- `src/Hung - SMC.pine`
- `src/Hung - MSS.pine`
- `MASTER_PLAN_STATUS.md`

## Next actions
1. Move the 3 shared-identical `UI_*` helpers to KIT in one pass.
2. Keep local bias methods local per indicator (`get_data_bias_local`) with no KIT coupling.
3. Optional: rename `MSS_*` dynamic helpers to neutral local names too (for full consistency).

## Test now
- `src-versions/0326-54/Hung - Core.pine`
- `src-versions/0326-54/Hung - SMC.pine`
- `src-versions/0326-54/Hung - MSS.pine`
