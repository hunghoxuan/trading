# 0326-22 - UI fix for $$$ liquidity lines (one-pass)

## Completed
- File changed: `Hung - MSS.pine` (`@file-version: 0326-22`).

- Location managing `$$$` lines:
  - Seed/create: `process_data_register_liquidity_seed(...)`
  - Lifecycle/update: `process_data_horizontal_levels(...)` with `kind == HL_KIND_LIQ`

- Fix #1 (extend $$$ like standard S/R lines):
  - Switched LIQ line draw/update to SR-style right extension using:
    - `CORE.get_tf_line_ext_bars(...)`
    - `SMC.get_sr_x(...)`
  - Updated LIQ draw xloc to `xloc.bar_index` and x2 to `liqRightIdx`.

- Fix #2 (hide $$$ after cross):
  - On LIQ cross (`liqPenetrated`), for non-LTF LIQ (`$$$`), delete line+label immediately.
  - No more `$$$` shown after cross.

- Notes:
  - IDM (LTF liquidity) keeps previous lifecycle visualization behavior.

## Files to test
1. `src-versions/0326-22/Hung - MSS.pine`

## Next actions / plan
1. Verify on chart: `$$$` extends forward and disappears after cross.
2. If UI behavior is correct, freeze `0326-22` as current UI baseline.
