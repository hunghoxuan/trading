# 0327-17 — Fix compile error: global mutate in function

## Completed
- Fixed Pine compile error in SMC:
  - `Cannot modify global variable 'workingFirstBar' in function`
- Applied same-safe pattern to both SMC and MSS:
  - Function `process_data_update_working_bar_line()` no longer mutates global.
  - Global `workingFirstBar` is updated in main flow (bar scope) before calling function.
- Updated file headers to `@file-version: 0327-17`.

## Files
- `src/Hung - SMC.pine`
- `src/Hung - MSS.pine`

## Test target
- Use files in: `src-versions/0327-17/`
