# Version 0326-61 - Final Cleanup Pass (END)

## Done
1. Updated file headers:
- Hung - Core.pine -> @file-version: 0326-61
- Hung - SMC.pine -> @file-version: 0326-61
- Hung - MSS.pine -> @file-version: 0326-61

2. SMC/MSS final directional cleanup:
- Removed legacy settings:
  - `signalFilterBiasLtf`, `signalFilterBiasHtf1`, `signalFilterBiasHtf2`
  - `signalFilterLong`, `signalFilterShort`
- Removed runtime dependency on these toggles.
- Direction gating now stays on model dynamic checks + signal memory flow.

3. Core trade-config trim:
- Removed legacy settings:
  - `entryFilterBias`, `entryFilterLong`, `entryFilterShort`
  - `entryRrInput`
- Simplified trigger queue API:
  - `process_data_triggers_queue(CORE.ChartContext ctx)` (dropped unused RR arg)
- Trigger RR remains schema-driven (`EntryModelDef.rr`).

4. Plan/status sync:
- Updated `MASTER_PLAN_STATUS.md` heads and one-pass note `0326-61`.

## Why
- Complete requested cleanup branch and stop infinite micro-steps.
- Reduce global fallback branches and make behavior more schema-driven.

## Test focus
1. Compile all 3 files:
- Hung - Core
- Hung - SMC
- Hung - MSS
2. Verify removed settings are not shown in UI.
3. Smoke test entries for long/short triggering and RR behavior per model.

## End state
- Cleanup branch is considered complete at 0326-61.
- Next work should be bug-fix only (if any issues found during test), not more cleanup splits.
