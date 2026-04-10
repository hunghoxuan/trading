# 0326-17 - Phase C pass 2 (dead limitation branch cleanup)

## Completed
- File changed: `Hung - SMC.pine`.
- Header bumped to `@file-version: 0326-17`.

- Removed dead HTF-only filter branch in limitation config:
  - Removed fields:
    - `entryFilterHtfOnlyEnable`
    - `entryFilterHtfMinRank`
  - Removed strict-level assignments for that flag.
  - Removed runtime check branch in `passes_pdarray_trade_filter(...)`.

## Why safe
- HTF-only filter flag was hardcoded false in all config paths and had no input to enable.
- Removing this branch is behavior-neutral and reduces dead complexity.

## Files to test
1. `src-versions/0326-17/Hung - SMC.pine`

## Next actions / plan
1. Build and publish compact master-plan status board (A/B/C) so workflow stays controlled.
2. Then only continue with next phase after your explicit go.
