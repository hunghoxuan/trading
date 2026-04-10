# Version 0327-11 - Core Model-Driven Trade Config (Global Removed)

## Done
1. Updated file header:
- Hung - Core.pine -> @file-version: 0327-11
- Hung - SMC.pine remains @file-version: 0327-10
- Hung - MSS.pine remains @file-version: 0327-10

2. Removed remaining Core global trade controls:
- Inputs removed:
  - `entryMaxStart`
  - `entryDynamicTp`
  - `signalSlProfile`
  - `signalGapRiskPct`
- Legacy constants/helpers removed:
  - `SL_PROFILE_LOOSE/BALANCED/STRICT`
  - `get_data_trade_gap_profile_floors(...)`

3. Switched Core entry execution to model-driven config:
- Uses `EntryModelDef` dynamic fields from `get_data_entry_model_dynamic_cfg(...)`:
  - `max_active`
  - `dynamic_tp_sl`
  - `risk_zone_pct`
- Updated `process_data_add_strategy_entry(...)` signature to accept model dynamic params.
- Updated `process_data_triggers_queue(...)` to enforce per-model max-active before entry creation.

4. Removed global-dependent pending-prune branch in Core trades loop.

5. Status sync:
- Updated `MASTER_PLAN_STATUS.md` with one-pass `0327-11` and current src heads.

## Why
- Finalizes Core migration from global trade toggles to per-model behavior controls.
- Reduces settings noise and keeps trade logic consistent with EntryModel design.

## Test focus
1. Compile Core/SMC/MSS.
2. In Core settings, verify removed global trade controls no longer appear.
3. Verify Core trade creation still works and honors per-model caps/dynamic TP/risk behavior.
