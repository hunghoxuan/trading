# Version 0326-59 - Remove Unused Legacy Inputs (SMC/MSS)

## Done
1. Updated file headers:
- Hung - SMC.pine -> @file-version: 0326-59
- Hung - MSS.pine -> @file-version: 0326-59

2. Removed unused legacy inputs in SMC/MSS:
- `signalEntryMode`
- `signalRiskZonePct`

3. Status sync:
- Updated `MASTER_PLAN_STATUS.md`:
  - Current src heads (SMC/MSS -> 0326-59)
  - Added one-pass note `0326-59`.

## Why
- Both fields had no runtime reads, so they only added settings noise.
- This continues the cleanup path to phase out global Trade Config in favor of EntryModel schema.

## Test focus
1. Compile `Hung - SMC` and `Hung - MSS`.
2. Open Settings and confirm two inputs are no longer shown.
3. Smoke test signal/trade behavior to confirm unchanged execution.

## Next actions
1. Apply same dead-input sweep on Core trade config (remove fields that are now model-schema redundant).
2. Convert remaining global fallbacks to EntryModelDef-only reads in SMC/MSS.
3. Plan final removal of `9. Legacy Trade Config (Compat)` after one stable cycle.
