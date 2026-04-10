# file-version 20260326-075500

## Done in this increment
- Continued settings cleanup.
- MSS: reduced config structs to runtime-used fields only; simplified limitation builder call path.
- SMC: removed unused UIConfig fields (msShowSwings/msShowBosMss/msShowZigzag) that had no runtime references.

## Test this version
- src-tmp/Hung - MSS@file-version-20260326-075500.pine
- src-tmp/Hung - SMC@file-version-20260326-075500.pine
