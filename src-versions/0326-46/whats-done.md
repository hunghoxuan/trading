# 0326-46 - Bias Row As Persistent Header

## Completed
- Made bias row persistent at table header (`row 0`) for:
  - Core
  - SMC
  - MSS
- Shifted stats render block down by 1 row via `rowOffset=1` support in Kit UI stats renderers.
- Kept no-trade behavior clean:
  - clear stats area rows `1..23`
  - keep header bias row visible at `row 0`.

## Files changed
- `src/Kit - UI.pine`
- `src/Hung - Core.pine` (`@file-version: 0326-46`)
- `src/Hung - SMC.pine` (`@file-version: 0326-46`)
- `src/Hung - MSS.pine` (`@file-version: 0326-46`)
- `MASTER_PLAN_STATUS.md`

## Next Actions
1. Compile Core/SMC/MSS with this version.
2. Verify table layout:
   - header row always shows `CORE/SMC/MSS + TF arrows`
   - trade stats begin from next row.
