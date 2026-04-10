# 0326-34 - Core LocalCfg Completion

## Completed
- Finished one-pass `LocalCfg` migration in `Hung - Core`.
- Replaced all remaining legacy constants/usages with `localCfg` fields:
  - Pivot lengths
  - SL min/max clamp parameters
  - LTF bias-memory window/weight/max-events
  - Signal context bars
- Removed redundant helper `get_data_signal_context_bars()` and unified source of truth to `localCfg.signalContextBars`.
- Synced head map in `MASTER_PLAN_STATUS.md`:
  - `src/Hung - Core.pine` -> `@file-version: 0326-34`

## Notes
- This pass is behavior-neutral by design: no strategy logic changes, only config source unification and dead-path cleanup.

## Next Actions
1. Compile `Hung - Core` and verify no regressions in:
   - divergence labels windowing
   - strategy signal emission window
   - SL clamp behavior.
2. If compile/chart OK, next one-pass should target shared config naming harmonization between `MSS/SMC/Core` (single local config naming style), without changing trade behavior.
