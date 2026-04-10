# Version 0326-49 - One-pass (1 + 3) + Roadmap Update

## Completed
- One-pass item 1: dashboard trade counting now follows visible chart states + lookback in all 3 indicators (Core/SMC/MSS) via local `UI_collect_dashboard_trades(...)`.
- One-pass item 3: Core entry SL anchor now snaps to nearest structural swing first (`CORE_get_sl_anchor_from_swings(...)`) before risk-gap expansion.
- Safety/compile hardening: Core risk-gap floors now have deterministic defaults when `Dynamic TP/SL` is OFF.
- Roadmap updated with schema-driven EntryModel requirement:
  - Added detailed fields (`rr`, `entry_point`, `bias_ltf`, `bias_htf1`, `bias_htf2`, `required_previous_events`, `bias_direction`, optional runtime fields).
  - Added target architecture: one generic dynamic condition checker and migration away from global `Trade Config`.

## Files changed in this version
- `src/Hung - Core.pine`
- `src/Hung - SMC.pine`
- `src/Hung - MSS.pine`
- `MASTER_PLAN_STATUS.md`
- `.agents/roadmap/MASTER_PLAN.md`
- `.agents/roadmap/ACTIVE_SPRINT.md`

## Next actions
1. Implement EntryModel schema v2 fields in `CORE.EntryModelDef` (or local wrapper type per indicator) without behavior break.
2. Build one generic `check_entry_model_dynamic(...)` path and map existing model logic to config fields.
3. Start migration of `3. Trade Config` inputs to per-model defaults; keep temporary compatibility bridge for one version.

## Test now
- Compile/test from:
  - `src-versions/0326-49/Hung - Core.pine`
  - `src-versions/0326-49/Hung - SMC.pine`
  - `src-versions/0326-49/Hung - MSS.pine`
