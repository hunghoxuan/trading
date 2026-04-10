# Major Update Summary (2026-02-27)

## Scope
- Compact tooltip UX and align confluence thresholds/gating across dashboard and entries.

## Implemented
1. Added confluence profile presets in `Settings`:
- `Custom`, `Scalp`, `Intraday`, `Swing`.
- Profiles drive effective min score % thresholds for Trend/Bias and Buy/Sell.

2. Added `Min Abs Score %` controls:
- Trend/Bias (`Bias` group)
- Buy/Sell (`Buy/Sell` group)
- Used when profile is `Custom`.

3. Compact tooltip formatting:
- Factor rows now include score weight in parentheses and concise value/condition text.
- Example: `RSI (1): +1 | 52.4 | >50 bull / <50 bear`.

4. Shared score gate integration:
- `_controlZone(...)` pending OB/FVG retest entries now require Buy/Sell confluence score gate pass (`abs%` + direction).
- Uses same score engine as dashboard for consistency.

5. Additional tuning controls:
- Bias: EMA lengths, RSI thresholds, ADX threshold.
- Buy/Sell: sweep lookback, trigger persistence bars, per-component enable toggles.

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_204648_v1.2.5_tooltip_factor_score_paren_pre_refactor`

## Files Updated
- `/Users/macmini/Trade/Bot/Hung Bot/src/_2_ICT-SMC-PA All-in-one2.pine`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/features/BIAS_CONFLUENCE_CHECKBOX_ENGINE.md`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/schedule/ROADMAP.md`
