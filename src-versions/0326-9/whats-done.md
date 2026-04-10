# 0326-9 - MSS closed-bar execution gate

## Completed
- Added closed-bar execution gate in `Hung - MSS.pine`:
  - `calcOnClosedBar = barstate.ishistory or barstate.isconfirmed`
- Moved heavy update flow under this gate:
  - `process_data_liquidity(doSeedRefresh)`
  - `process_data_eq()`
  - `process_data_sr(doSeedRefresh)`
  - `process_data_entries(canEmitSignals)`
- Result: avoid repeated intrabar recalculation/redraw on realtime ticks, while keeping bar-close behavior.
- Bumped header:
  - `src/Hung - MSS.pine` -> `@file-version: 0326-9`
- Snapshot created in `src-versions/0326-9/`.

## Next actions
1. Compile and test `src-versions/0326-9/Hung - MSS.pine`.
2. One-pass tiếp theo: áp dụng closed-bar gate tương đương cho khối tính pivot/trend nặng trong `Hung - SMC.pine` (để lấy thêm tốc độ, giữ nguyên logic entry).
3. Sau đó mới làm pass giản lược score/limitation runtime-active (chỉ bỏ cái low-value thật sự).
