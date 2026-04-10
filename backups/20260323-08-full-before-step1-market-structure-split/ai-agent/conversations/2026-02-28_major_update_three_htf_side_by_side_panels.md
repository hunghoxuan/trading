# Major Update Summary (2026-02-28)

## Scope
Replace single HTF mini-chart overlay with 3 HTF mini-charts using existing settings timeframes and explicit spacing/labeling.

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260228_220131_pre_3_htf_side_by_side`

## Implemented
- Removed legacy single-source HTF candle block (`htf_manual/auto_htf` path).
- Added 3 independent HTF candle data streams using settings:
  - `biasTf1`, `biasTf2`, `biasTf3`
- Added 3 independent render stores:
  - `candle_store_1`, `candle_store_2`, `candle_store_3`
- Added fixed inter-panel spacing constant:
  - `HTF_GROUP_GAP = 10`
- Added helper functions:
  - `get_htf_candle_count(...)`
  - `get_htf_chart_span(...)`
  - `get_htf_range(...)`
  - `update_htf_name_label(...)`
- Draw behavior:
  - Panels are rendered side-by-side to the right with 10-bar gap between panels.
  - Label under each panel shows friendly TF name from settings (`get_friendly_tf(biasTfX)`).

## Notes
- Existing HTF projected zones (OB/FVG) logic remains unchanged.
- This update targets HTF candle mini-chart visualization only.
