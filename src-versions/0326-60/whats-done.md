# Version 0326-60 - SMC/MSS EntryModelDef-Only RR + EntryPoint

## Done
1. Updated file headers:
- Hung - SMC.pine -> @file-version: 0326-60
- Hung - MSS.pine -> @file-version: 0326-60

2. SMC cleanup:
- Removed legacy inputs:
  - `signalRrInput`
  - `signalEntryAtEdge`
  - `signalEntryAtMiddle`
  - `signalEntryAtEnd`
- Entry RR now uses schema only:
  - `rrUsed = max(rrCfg, 0.1)`
- Entry point mode now uses `EntryModelDef.entry_point` only (no toggle fallback).

3. MSS cleanup:
- Removed legacy input:
  - `signalRrInput`
- Entry RR now uses schema only:
  - `rrUsed = max(rrCfg, 0.1)`

4. Status sync:
- Updated `MASTER_PLAN_STATUS.md` current heads and added one-pass record `0326-60`.

## Why
- Continue migration from global Trade Config fallback to model-schema driven execution.
- Reduce compile/runtime branch noise in hot entry path.

## Test focus
1. Compile `Hung - SMC` and `Hung - MSS`.
2. Verify settings no longer show removed legacy RR/entry-point toggles.
3. Smoke test entries still open with expected RR/entry point per model.

## Next actions
1. Sweep remaining legacy directional filters (`signalFilterBias*`, `signalFilterLong/Short`) and migrate to full schema-only gating.
2. Then do Core pass: evaluate which global `Trade Config` controls remain truly required vs removable.
3. After one stable cycle, remove `9. Legacy Trade Config (Compat)` group entirely in SMC/MSS.
