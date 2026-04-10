# 0326-16 - Phase C pass 1 (settings dead-field cleanup)

## Completed
- File changed: `Hung - SMC.pine`.
- Header bumped to `@file-version: 0326-16`.
- Removed dead score setting field:
  - `SignalScoreCfg.scoreSweep`
  - and its assignments in `get_signal_score_cfg(...)`

## Why safe
- `scoreSweep` had zero runtime reads after Phase B changes.
- No trade/risk execution branch depended on this field.

## Files to test
1. `src-versions/0326-16/Hung - SMC.pine`

## Next actions / plan
1. Phase C pass 2: continue dead-field/input cleanup in SMC + MSS with behavior-neutral only.
2. Then produce compact master-plan status board (A/B/C with done/in-progress).
