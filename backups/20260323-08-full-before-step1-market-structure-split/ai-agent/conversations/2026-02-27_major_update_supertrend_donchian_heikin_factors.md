# Major Update Summary (2026-02-27)

## Scope
- Implement alternative bias methods requested: Supertrend, Donchian, Heikin-Ashi.

## Changes
1. Added Trend/Bias factors:
- Supertrend (default ON)
- Donchian (default ON)
- Heikin-Ashi regime (default OFF)

2. Added thresholds/settings near top-of-file inputs:
- Supertrend ATR length/multiplier
- Donchian length
- Existing core ranges retained (EMA/RSI/ADX)

3. Updated weighted scoring and tooltips:
- New factor weights/constants wired into max score and signed score.
- HTF dashboard cells/tooltip use timeframe-specific values for new factors.

4. Added/retained profile-aware thresholding and score-gate consistency:
- Scalp/Intraday/Swing profile support.
- Shared Buy/Sell confluence score gate in `_controlZone` entry creation.

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_224700_v2.6.0_supertrend_donchian_heikin_added`

## Files Updated
- `/Users/macmini/Trade/Bot/Hung Bot/src/_2_ICT-SMC-PA All-in-one2.pine`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/features/BIAS_CONFLUENCE_CHECKBOX_ENGINE.md`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/schedule/ROADMAP.md`
