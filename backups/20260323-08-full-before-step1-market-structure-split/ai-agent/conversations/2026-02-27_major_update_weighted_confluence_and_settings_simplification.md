# Major Update Summary (2026-02-27)

## Scope
- Refine confluence system UX and scoring behavior for both Trend/Bias and Buy/Sell.

## Implemented
1. Group naming/order finalized:
- `Settings` -> `Trend/Bias` -> `Market Structure` -> `ICT/SMC` -> `Indicators` -> `Buy/Sell`.

2. Weighted scoring model:
- Trend/Bias and Buy/Sell now use weighted signed contributions instead of equal-weight points.
- Factor labels now include score in settings (e.g., `Use RSI (1)`).
- Higher impact factors are listed first in tooltips.

3. Settings simplification:
- BB walk complexity reduced: one `Use BB Walk (1)` switch only.
- BB length/mult/tolerance moved to fixed defaults in constants.

4. Tunable ranges added:
- Trend/Bias: EMA fast/slow, RSI length/mid/impulse high/low, ADX length/min threshold.
- Buy/Sell: sweep lookback and trigger persistence bars.

5. Min confluence input removed:
- Manual `Min Confluence Score` removed.
- Threshold now auto-derived from active max score.

6. Tooltip format update:
- Both Trend/Bias and Buy/Sell use `State Total score/max -> %`.
- Per-indicator line shows signed score and explanation with live values.

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_202536_v1.2.4_weighted_scores_simplified_settings_pre_refactor`

## Files Updated
- `/Users/macmini/Trade/Bot/Hung Bot/src/_2_ICT-SMC-PA All-in-one2.pine`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/features/BIAS_CONFLUENCE_CHECKBOX_ENGINE.md`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/schedule/ROADMAP.md`
