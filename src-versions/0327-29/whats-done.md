# 0327-29

## Done
- Fixed MSS compile error `Undeclared identifier 'htf1'` at line ~267.
- Updated `get_data_working_first_time_for_source_tf()` to resolve HTF slot via local `CORE.get_htf_pair()` (`tf1Local/tf2Local`) instead of early runtime `htf1/htf2`.
- Added Pine-safe guard for history offsets (`<= 10000`) in working-first-time helpers to avoid runtime bars-back errors.
- Updated MSS header to `@file-version: 0327-29`.

## Changed files
- Hung - MSS.pine
