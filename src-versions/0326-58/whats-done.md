# Version 0326-58 - Trade Config Demotion (Compat)

## Done
1. Updated file headers:
- Hung - Core.pine -> @file-version: 0326-58
- Hung - SMC.pine -> @file-version: 0326-58
- Hung - MSS.pine -> @file-version: 0326-58

2. Settings cleanup (no logic change):
- Moved global trade config inputs from `3. Trade Config` to `9. Legacy Trade Config (Compat)`.
- Applied in all indicators:
  - Hung - Core
  - Hung - SMC
  - Hung - MSS

3. Roadmap/status sync:
- Updated `MASTER_PLAN_STATUS.md` current src heads to 0326-58.
- Added one-pass record: `0326-58 (Trade Config Demoted To Legacy Compat Group)`.

## Why
- Keep model-level EntryModel defaults as primary control surface.
- Reduce clutter/confusion in settings while preserving backward compatibility for one stabilization cycle.

## Test focus
1. Open each indicator settings panel and confirm group title is now:
- `9. Legacy Trade Config (Compat)`.
2. Quick compile check for all 3 files.
3. Basic signal/trade behavior smoke test (should be unchanged vs previous version).

## Next actions
1. Remove truly unused legacy inputs in SMC/MSS (starting from `signalEntryMode` if still unused).
2. Replace remaining global fallback reads with EntryModelDef-only reads.
3. After one stable cycle, remove legacy group entirely.
