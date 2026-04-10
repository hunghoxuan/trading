# file-version 20260326-075652

## Done in this increment
- SMC: removed unused UIConfig fields (`msShowSwings`, `msShowBosMss`, `msShowZigzag`).
- SMC: removed unused LimitationCfg fields not referenced by runtime.
- SMC: removed unused constants (`FIB_RATIO_1`, `FIB_RATIO_3`, `STRUCTURE_LOOKBACK_MULT`, `EQ_SAFE_HISTORY_OFFSET`, `SMC_TEXT`, `SIGNALS_TEXT`, `ENTRIES_TEXT`).
- Kept all active trade logic unchanged.

## Test this version
- src-tmp/Hung - MSS@file-version-20260326-075652.pine
- src-tmp/Hung - SMC@file-version-20260326-075652.pine
