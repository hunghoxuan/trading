# 0327-27 — Fix HTF debug lines overlapping with LTF

## Problem
- HTF1/HTF2 debug lines could overlap at same x as LTF due to bar-index clamping logic.

## Fix
- Switched HTF debug lines from `xloc.bar_index` to `xloc.bar_time`.
- Added TF-specific first-working-time computation:
  - `get_working_first_time_for_tf(tf)`
  - maps TF ratio to safe historical time offset.
- Updated HTF1/HTF2 debug line updates to use TF-specific timestamps.

## Files
- `src/Hung - SMC.pine` (`@file-version: 0327-27`)
- `src/Hung - MSS.pine` (`@file-version: 0327-27`)

## Test target
- Use files in: `src-versions/0327-27/`
