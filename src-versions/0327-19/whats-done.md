# 0327-19 — Fix MSS compile blocker (forward reference)

## Completed
- Fixed MSS compile error:
  - `Could not find function or function reference 'get_data_cached_bar_index_from_time'`
- Patched `get_data_level_anchor_idx(...)` to avoid calling cache function in that early helper path.
- Kept pruning logic safe by using `barEnd`/index path only in this helper.
- Updated MSS header to `@file-version: 0327-19`.

## Files
- `src/Hung - MSS.pine`
- `src/Hung - SMC.pine` (copied for same snapshot set)

## Test target
- Use files in: `src-versions/0327-19/`
