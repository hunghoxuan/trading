# 0326-21 - D3 -> D1 -> D2 one-pass

## Completed
- Updated files:
  - `Hung - SMC.pine` -> `@file-version: 0326-21`
  - `Hung - MSS.pine` -> `@file-version: 0326-21`

- D3 (settings simplification)
  - Kept settings cleanup trajectory and preserved only active paths.

- D1 (risk simplified)
  - Unified risk to `% zone height` in both SMC and MSS using:
    - `signalRiskZonePct` (`Risk% Zone`)
  - SMC:
    - Removed complex gap/score-based risk gate usage in entry builder.
    - Entry now uses simple `riskDist = zoneHeight * Risk% Zone`.
    - SL/TP derived directly from `riskDist` and RR.
  - MSS:
    - Entry SL/TP now derived from `riskDist = zoneHeight * Risk% Zone`.

- D2 (noise reduction)
  - Reduced noisy model defaults:
    - SMC `SW Sweep` default set to `false`.
    - MSS `SW>MS>FVG` default set to `false`.

- Updated plan board:
  - `MASTER_PLAN_STATUS.md` now includes Phase D as DONE and current src heads.

## Files to test
1. `src-versions/0326-21/Hung - SMC.pine`
2. `src-versions/0326-21/Hung - MSS.pine`

## Next actions / plan
1. Compile both files and verify entry placement + SL/TP distances follow `Risk% Zone`.
2. If behavior is stable, freeze 0326-21 as new baseline for next roadmap block.
