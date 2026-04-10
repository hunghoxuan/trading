# Version 0326-25 - Use UI Kit Marker for Reclass X

## Done
- Updated `src/Hung - MSS.pine` to `@file-version: 0326-25`.
- Replaced raw `label.new(...)` for invalidation marker with UI kit shared marker helper:
  - `UI.draw_strategy_marker(...)`
  - same family used by Core for VWAP/RSI/HVB markers.
- Marker behavior on BOS/MSS invalidation:
  - icon: `X`
  - direction mapped by reclaim side (`dir==1 -> Sell`, `dir==-1 -> Buy`)
  - display mode: `CONST.DISP_MARKER`
- Kept previous requested behavior unchanged:
  - append ` x` to old BOS/MSS line label text
  - liquidity text `$$$ -> $`
- Updated `MASTER_PLAN_STATUS.md` MSS head -> `0326-25`.

## Next Actions
1. Compile and test `src-versions/0326-25/Hung - MSS.pine`.
2. Confirm `X` marker style now matches Core marker system.
3. If needed, next pass can switch `CONST.DISP_MARKER` -> `CONST.DISP_EVENT` for more prominent `X` labels.
