# Version 0326-50 - EntryModel Dynamic Foundation

## Completed
- Added local EntryModel dynamic config methods with shared signature in all 3 indicators:
  - Core: `CORE_get_entry_model_dynamic_cfg`, `CORE_check_entry_model_dynamic`
  - SMC: `SMC_get_entry_model_dynamic_cfg`, `SMC_check_entry_model_dynamic`
  - MSS: `MSS_get_entry_model_dynamic_cfg`, `MSS_check_entry_model_dynamic`
- Integrated dynamic checker into entry/trade pipeline:
  - Core trigger queue now checks dynamic rule per model and uses model RR.
  - SMC add-entry now uses model config bridge for RR, risk%, max-active, entry-point mode.
  - MSS add-entry now uses model config bridge for RR, risk%, max-active, entry-point mode.
- Backward compatibility bridge retained:
  - Dynamic config currently maps to existing `3. Trade Config` values to avoid behavior break.

## Files changed in this version
- `src/Hung - Core.pine`
- `src/Hung - SMC.pine`
- `src/Hung - MSS.pine`
- `MASTER_PLAN_STATUS.md`
- `.agents/roadmap/ACTIVE_SPRINT.md`

## Next actions
1. Move per-model defaults from bridge into real per-model fields (different RR/entry_point/bias per model key).
2. Add parser for `required_previous_events` (token list) and use signal history window by model.
3. Start removing duplicated global Trade Config switches after one stable test cycle.

## Test now
- `src-versions/0326-50/Hung - Core.pine`
- `src-versions/0326-50/Hung - SMC.pine`
- `src-versions/0326-50/Hung - MSS.pine`
