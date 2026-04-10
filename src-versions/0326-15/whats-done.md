# 0326-15 - Phase B pass 2 (soft-score residue cleanup)

## Completed
- File changed: `Hung - SMC.pine`.
- Header bumped to `@file-version: 0326-15`.

- Cleanup after Phase B pass 1:
  - Removed leftover always-true gating variables from barrier-touch flow.
  - Simplified to direct checks (`touched + validDirection`) with direct score usage.
  - Removed redundant always-true `passForType` branch in retest-signal registration.

- Verified no remaining soft-confluence dependencies:
  - no `apply_candle_pattern_confluence`
  - no `cpCfg`
  - no `signalMinConfluenceScore`

## Safety note
- Hard-risk + trade-score checks in `process_data_add_entry(...)` unchanged.

## Files to test
1. `src-versions/0326-15/Hung - SMC.pine`

## Next actions / plan
1. Phase B pass 3: scan MSS for remaining low-value score branches and trim only if behavior-neutral.
2. Then produce Phase B closeout summary and freeze branch for next phase.
