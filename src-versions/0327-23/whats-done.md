# 0327-23 — Relevance-first pruning for PDArray/Levels (One-Pass)

## Plan executed
1. Keep only the most important structures around current price.
2. Prioritize proximity to swing extremes and leg origin semantics.
3. Apply in runtime without adding new Settings/LocalCfg fields/constants.

## Completed
- SMC:
  - Added relevance scoring for active PDArray zones.
  - Score priorities:
    - near current price
    - near latest swing H/L (side-aware)
    - near leg foot (via lower `legSeqAll` bonus)
    - source TF rank + quality as tie-breakers
  - Added pruning pass to keep only up to:
    - `2` zones above current price
    - `2` zones below current price
  - Integrated prune step before entry processing each closed bar.
- MSS:
  - Added relevance scoring for levels (LIQ/EQH/EQL/SR).
  - Score priorities:
    - near current price
    - near latest swing H/L (side-aware)
    - source priority/quality tie-breakers
  - Added pruning pass to keep only up to:
    - `2` levels above current price
    - `2` levels below current price
  - Integrated prune step before entry processing each closed bar.

## Files
- `src/Hung - SMC.pine` (`@file-version: 0327-23`)
- `src/Hung - MSS.pine` (`@file-version: 0327-23`)

## Test target
- Use files in: `src-versions/0327-23/`
