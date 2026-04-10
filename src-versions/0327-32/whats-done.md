# 0327-32

## Done
- Fixed HTF working-first cutoff merge logic that caused HTF debug lines to collapse into one left-most line.
- Updated cutoff merge from `min(ratioTime, structTime)` to `max(ratioTime, structTime)` in both indicators:
  - SMC: `get_data_htf_detection_cutoff_time()`
  - MSS: `get_data_working_first_time_for_source_tf()`
- This keeps each HTF start tied to its own structural readiness instead of being dominated by extreme ratio fallback.
- Updated file headers:
  - SMC -> `@file-version: 0327-32`
  - MSS -> `@file-version: 0327-30`

## Changed files
- Hung - SMC.pine
- Hung - MSS.pine
