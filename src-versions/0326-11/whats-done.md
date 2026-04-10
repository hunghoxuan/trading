# 0326-11 - config recompute trim (one-pass)

## Completed
- `Hung - MSS.pine`
  - Moved static config re-init to first bar only:
    - `limCfg := get_limitation_cfg()`
    - `detCfg := get_detection_cfg(1)`
    - `uiCfg := get_ui_cfg(1, THEME)`
    - `ZONE_VIS_CFG.minWidthBars := uiCfg.zoneCurrMinWidthBars`
  - Header bumped to `@file-version: 0326-11`.

- `Hung - SMC.pine`
  - Converted per-bar config rebuild to one-time init on `barstate.isfirst`:
    - `limitStrict`, `scoreProfileId`
    - `limCfg/detCfg/uiCfg/sigCfg/cpCfg`
    - zone visual/extend assignments (`cfgOB/cfgFVG/cfgRJB/cfgSD/cfgBB/cfgIFVG`)
  - Keeps same config logic, only stops unnecessary per-bar recomputation.
  - Header bumped to `@file-version: 0326-11`.

- Snapshot created in `src-versions/0326-11/` with both changed files.

## Next actions
1. Compile and test:
   - `src-versions/0326-11/Hung - MSS.pine`
   - `src-versions/0326-11/Hung - SMC.pine`
2. One-pass tiếp theo: cắt thêm nhánh score/limitation ít giá trị thực tế (ưu tiên các nhánh chỉ tác động score signal, không tác động risk hard-check).
3. Sau đó làm pass dọn settings UI (ẩn/loại controls low-value) và xuất `0326-12`.
