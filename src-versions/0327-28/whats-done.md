# 0327-28 — HTF start from HTF structure, then mapped to chart

## Implemented intent
- HTF start is no longer a pure LTF-window cutoff.
- HTF start now uses HTF structure availability (pair of swing H/L), then maps to chart time/index for detect + debug.

## SMC changes
- Added HTF structural start-time helpers:
  - `get_data_tf_struct_pair_start_time(tfSlot)`
  - `get_data_htf_detection_cutoff_time(tfSlot, tfName)`
- HTF pdarray detect gating now uses HTF-specific cutoff time (not LTF `time[lookback]`):
  - in `add_htf_pdarray_if_valid(...)`
  - in `draw_data_htf_pdarray_set(...)`
- HTF debug lines now use the same HTF detection cutoff source.
- Zone prune first-bar cutoff is TF-aware by zone source TF (`LTF/HTF1/HTF2`).

## MSS changes
- Added source-TF working-start helpers:
  - `get_data_tf_struct_pair_start_time(tfSlot)`
  - `get_data_working_first_time_for_source_tf(sourceTf)`
  - `get_data_working_first_idx_for_source_tf(sourceTf)`
  - `is_in_working_zone_idx_for_source_tf(idx, sourceTf)`
- HTF seed/register gates now use source-TF-aware window checks (not LTF-only check):
  - `process_data_register_sr_seed(...)`
  - `process_data_register_liquidity_seed(...)`
  - `process_data_seed_from_swings(...)`
- Level prune first-bar cutoff is TF-aware by level source TF.
- HTF debug lines now use source-TF working first time.

## Files
- `src/Hung - SMC.pine` (`@file-version: 0327-28`)
- `src/Hung - MSS.pine` (`@file-version: 0327-28`)

## Test target
- Use files in: `src-versions/0327-28/`
