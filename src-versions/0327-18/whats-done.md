# 0327-18 — Fix compile error: global line mutate in function

## Completed
- Fixed compile error in MSS:
  - `Cannot modify global variable 'workingFirstBarLine' in function`
- Applied same fix pattern to both MSS and SMC:
  - `process_data_update_working_bar_line(...)` now takes current line + first bar and returns updated line.
  - Global assignment is done in bar scope:
    - `workingFirstBarLine := process_data_update_working_bar_line(...)`
- Updated file headers to `@file-version: 0327-18`.

## Files
- `src/Hung - MSS.pine`
- `src/Hung - SMC.pine`

## Test target
- Use files in: `src-versions/0327-18/`
