# Major Update Summary (2026-02-28)

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/versions/ict_smc [hung].pine.ver_20260228_223641_stable_before_htf_order_rules`

## Scope
Implement 3 HTF mini-chart panels with strict source order and filtering while staying token-safe.

## Implemented in `/Users/macmini/Trade/Bot/Hung Bot/src/ict_smc [hung].pine`
- Removed legacy single `auto_htf` panel block.
- Added 3-panel rendering pipeline with 10-bar panel gap.
- Source order:
  1. `HTF Candles` (`globalHtfString`)
  2. `HTF Bias 1`
  3. `HTF Bias 2`
  4. `HTF Bias 3`
- Filter rules:
  - Dedupe timeframe strings.
  - Ignore Bias TFs if `<= HTF Candles` timeframe.
  - Draw up to 3 panels total.
- Added settings with defaults:
  - `HTF Candles` = 16
  - `Bias1` = 12
  - `Bias2` = 7
  - `Bias3` = 3
- Added timeframe label under each panel.

## Notes
- This implementation prioritizes lower token impact vs prior dynamic-sort refactor.
