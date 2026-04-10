# 0327-24 — Ensure both above/below PDArray with LTF+HTF preference

## Problem observed
- In some contexts, prune logic removed all PDArray below current price.

## Completed
- Reworked SMC zone pruning selection logic:
  - For each side (`above`, `below`), try to keep:
    1. best HTF zone (`sourceTfRank >= 2`)
    2. best LTF zone (`sourceTfRank <= 1`)
  - If one class is missing, fallback fills remaining slot with best available zone on that side.
- Side-aware relevance score remains based on:
  - near current price
  - near latest swing H/L on that side
  - leg foot preference (lower `legSeqAll`)
- No new Settings/LocalCfg fields/constants were added.

## File
- `src/Hung - SMC.pine` (`@file-version: 0327-24`)

## Test target
- Use: `src-versions/0327-24/Hung - SMC.pine`
