# Version 0326-26 - BOS/MSS Color + Bear Label Position

## Done
- Updated `src/Hung - MSS.pine` to `@file-version: 0326-26`.
- Fixed HTF BOS/MSS invalidated color behavior:
  - Removed forced neutral recolor on invalidation.
  - Keep original TF color, only apply dotted style + append ` x`.
- Fixed label position for down/bear structure events:
  - Added separate event draw config for down side.
  - Down event text now renders below line (`vPos = -1`, `yPadTicks = 6.0`).
- Kept existing behavior:
  - invalidation marker uses UI kit helper `UI.draw_strategy_marker(...)`
  - liquidity marker remains `$` (not `$$$`).
- Updated `MASTER_PLAN_STATUS.md` MSS head -> `0326-26`.

## Next Actions
1. Compile and test `src-versions/0326-26/Hung - MSS.pine`.
2. Check two cases:
   - HTF BOS/MSS invalidated: color remains TF color (no unwanted gray override).
   - Bear/down BOS/MSS text is placed below line.
3. If still too near the line, next pass increase `yPadTicks` from `6` to `8`.
