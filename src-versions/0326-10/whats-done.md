# 0326-10 - SMC closed-bar gate (one-pass)

## Completed
- Added `calcOnClosedBar = barstate.ishistory or barstate.isconfirmed` in `Hung - SMC.pine`.
- Gated heavy trend/state updates to closed-bar only:
  - `CORE.process_tf_armed_state(...)`
  - `process_data_tf_ms_trend_light(...)`
- Gated dynamic lookback recompute by closed-bar condition (`shouldDynRecalc`).
- Gated chart context rebuild to closed-bar:
  - `chartCtx := process_data_chart_context()`
- Gated heavy zone creation/pruning/entry pipeline to closed-bar:
  - OB/RJB/FVG creation blocks
  - `annotate_new_pricezones(...)`
  - `prune_old_current_zones(...)`, `prune_current_pdarray_side_caps(...)`
  - HTF zone attach block
  - `process_data_entries(...)`
  - `prune_post_touch_pdarrays(...)`
- Bumped header:
  - `src/Hung - SMC.pine` -> `@file-version: 0326-10`
- Snapshot created in `src-versions/0326-10/`.

## Why this is safe
- Entry/signal logic already centered on confirmed bars (`canEmitSignals`), so closed-bar gating aligns with existing behavior intent while reducing intrabar recomputation.

## Next actions
1. Compile and test `src-versions/0326-10/Hung - SMC.pine`.
2. One-pass kế tiếp: giản lược score/limitation runtime-active low-value (ưu tiên bỏ các nhánh không ảnh hưởng trade-quality thực tế).
3. Sau đó làm pass cleanup settings UI: ẩn/loại các input ít giá trị nhưng vẫn giữ backward compatibility.
