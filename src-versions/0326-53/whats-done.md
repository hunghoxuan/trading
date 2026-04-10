# Version 0326-53 - One-pass Schema Lift + Queue Mode Migration

## Completed
- Lifted dynamic trade config into schema at type level:
  - Updated `src/Kit - Core.pine` `EntryModelDef` with fields:
    `rr`, `entry_point`, `bias_ltf`, `bias_htf1`, `bias_htf2`, `required_previous_events`, `required_window_bars`, `bias_direction`, `max_active`, `dynamic_tp_sl`, `risk_zone_pct`, `entry_mode`.
- Moved per-model defaults into `process_data_init_strategy_defs()` in:
  - `Hung - Core.pine`
  - `Hung - SMC.pine`
  - `Hung - MSS.pine`
- Removed local switch-map dynamic config logic:
  - Dynamic cfg readers now resolve directly from `strategyDefs` schema.
- Queue behavior migration (start removing global Trade Config):
  - SMC queue uses per-model `entry_mode` instead of global `signalEntryMode` for entry conversion paths.
  - MSS queue uses per-model `entry_mode` for LIMIT/AFTER-RETEST/OFF paths.
- Kept compatibility guardrails:
  - Existing model toggle/type/when settings remain active.
  - Global inputs still present for temporary stabilization window.

## Files changed
- `src/Kit - Core.pine`
- `src/Hung - Core.pine`
- `src/Hung - SMC.pine`
- `src/Hung - MSS.pine`
- `MASTER_PLAN_STATUS.md`
- `.agents/roadmap/ACTIVE_SPRINT.md`

## Next actions
1. Remove deprecated global `signalEntryMode` input in SMC/MSS after this test cycle confirms parity.
2. Move remaining global caps/risk toggles to schema-first usage (`max_active`, `risk_zone_pct`, `dynamic_tp_sl`) in all queue paths.
3. Optional: add per-bar cache for dynamic cfg lookup by model key (micro-opt).

## Test now
- `src-versions/0326-53/Hung - Core.pine`
- `src-versions/0326-53/Hung - SMC.pine`
- `src-versions/0326-53/Hung - MSS.pine`
- `src-versions/0326-53/Kit - Core.pine`
