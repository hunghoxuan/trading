# Version 0326-23 - BOS/MSS Reclass (Lightweight)

## Done
- Added lightweight BOS/MSS reclass tracker in `src/Hung - MSS.pine` (`@file-version: 0326-23`).
- Tracker scope: latest event per TF only (LTF/HTF1/HTF2), no history scan.
- New setting:
  - `MS reclass bars` (default `3`, range `1..30`) in UI Config.
- Reclass logic:
  - After a BOS/MSS event is emitted, keep it mutable only within `MS reclass bars`.
  - If bullish event is reclaimed (`close < break level`) inside window: set label to `xxx`, line style to neutral dotted.
  - If bearish event is reclaimed (`close > break level`) inside window: set label to `xxx`, line style to neutral dotted.
  - After timeout, tracker cache is cleared (`na`) to avoid stale state.
- Updated `MASTER_PLAN_STATUS.md` current head to MSS `0326-23`.

## Why this is low-risk for performance
- O(1) per TF per bar (max 3 slots).
- No extra loops over swings/levels/history.
- No new heavy object redraw path (updates only active latest event handle).

## Next Actions
1. Compile and test `src-versions/0326-23/Hung - MSS.pine`.
2. Validate 3 cases on chart:
   - BOS up then quick reclaim down within X bars -> label becomes `xxx`.
   - BOS/MSS without reclaim until timeout -> no further mutation.
   - New BOS/MSS after timeout -> tracker re-arms correctly.
3. If needed, tighten/relax reclaim basis (`close` vs `wick`) as a separate micro-pass.
