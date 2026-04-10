# 0326-14 - Phase B pass 1 (score/limitation simplification)

## Completed
- File changed: `Hung - SMC.pine`.
- Header bumped to `@file-version: 0326-14`.

- Removed low-value soft confluence layer (kept hard-risk/trade-score gate intact):
  - Removed all calls to `CORE.apply_candle_pattern_confluence(...)`.
  - Replaced adjusted confluence outputs with direct `reason + baseScore` flow.
  - Barrier-touch / retest / break-retest paths now skip soft confluence scoring.

- Removed now-dead confluence config and fields:
  - Removed `cpCfg` usage.
  - Removed `signalMinConfluenceScore` field and assignments.
  - Removed `scoreCandlePattern` and `scoreCandleVolume` from `SignalScoreCfg`.

## Safety note
- Hard risk checks and trade-score gating in `process_data_add_entry(...)` were not changed.
- This pass targets low-value "soft" score logic only.

## Files to test
1. `src-versions/0326-14/Hung - SMC.pine`

## Next actions / plan
1. Phase B pass 2 (MSS): trim low-value score branches if any remain runtime-active.
2. Phase B pass 3: remove/merge dead score settings labels that no longer affect behavior.
3. Then prepare Phase B closeout summary.
