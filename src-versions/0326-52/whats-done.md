# Version 0326-52 - One-pass EntryModel Generalization

## Completed
- Per-model defaults (no single shared bridge profile):
  - Core uses strategy-id based defaults.
  - SMC uses model-key based defaults (`TREND`, `BREAK_OUT`, `REJECTION`, `SWEEP`).
  - MSS uses model-key based defaults (`MSS`, `BOS`, `SWEEP`, `SWEEP_MSS`, `SWEEP_MSS_FVG`).
- Added `required_previous_events` token parser in Core/SMC/MSS:
  - Delimiter normalization supports: `, | + ; /`
  - Alias support: `MS -> MSS`, `BO -> BOS`, `SW -> SWEEP`
  - Per-model `requiredWindowBars` to validate recent event prerequisites.
- Started removing global `3. Trade Config` dependency:
  - SMC/MSS add-entry now uses model dynamic checker + long/short side toggle instead of legacy global bias gate.
  - Legacy global settings still exist as compatibility surface for stabilization cycle.

## Files changed
- `src/Hung - Core.pine`
- `src/Hung - SMC.pine`
- `src/Hung - MSS.pine`
- `MASTER_PLAN_STATUS.md`
- `.agents/roadmap/ACTIVE_SPRINT.md`

## Next actions
1. Move per-model defaults from local methods into a unified model schema type (next: add fields directly in model defs).
2. Migrate event-mode (`touch/retest/limit`) from global to per-model `entryModeCfg` and remove remaining global branching in queues.
3. After one stable cycle, remove or archive deprecated global `3. Trade Config` inputs.

## Test now
- `src-versions/0326-52/Hung - Core.pine`
- `src-versions/0326-52/Hung - SMC.pine`
- `src-versions/0326-52/Hung - MSS.pine`
