# 0327-31

## Done
- Fixed runtime error `Invalid number of bars back ... 0..10000` in SMC.
- Capped history offsets to `<= 10000` in:
  - `get_working_first_time_for_tf()`
  - `get_data_htf_sd_snapshot()`
- Updated SMC header to `@file-version: 0327-31`.

## Changed files
- Hung - SMC.pine
