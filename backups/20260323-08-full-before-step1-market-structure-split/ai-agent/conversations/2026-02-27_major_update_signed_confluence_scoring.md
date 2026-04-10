# Major Update Summary (2026-02-27)

## Scope
- Upgrade confluence model from pass/fail to signed scoring and align dashboard UX.

## Implemented
1. Group naming/order alignment:
- `Settings` -> `Trend/Bias` -> `Market Structure` -> `ICT/SMC` -> `Indicators` -> `Buy/Sell`.
- Renamed Buy/Sell group label and moved first `Indicators` declaration below Market Structure/SMC section.

2. Trend/Bias signed score model:
- Added reusable `get_bias_factor_scores(...)`.
- Each enabled factor contributes `+1` bull / `-1` bear / `0` neutral.
- Disabled factor contributes `0`.
- Bias state derives from signed total and `Min Confluence Score` threshold.

3. Trend/Bias tooltip format:
- `Bullish|Bearish|Neutral Total score/max -> %`.
- Per-indicator line now shows numeric score with value and condition explanation.

4. Buy/Sell signed score model:
- Added reusable `get_signal_confluence_scores(...)` and `get_signal_tooltip_detailed(...)`.
- Components: HTF bias, current TF bias, MSS, Sweep, HVB, FVG trigger, VWAP state, RSI state.
- Dashboard right cell now displays `B/S total/max %` with detailed score breakdown tooltip.

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_185922_v1.2.3_bias_confluence_phase2_pre_refactor`

## Files Updated
- `/Users/macmini/Trade/Bot/Hung Bot/src/_2_ICT-SMC-PA All-in-one2.pine`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/features/BIAS_CONFLUENCE_CHECKBOX_ENGINE.md`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/schedule/ROADMAP.md`
