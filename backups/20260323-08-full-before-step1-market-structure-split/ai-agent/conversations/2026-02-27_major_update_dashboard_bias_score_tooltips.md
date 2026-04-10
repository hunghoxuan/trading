# Major Update Summary (2026-02-27)

## Scope
- Improve dashboard bias readability and educational tooltip quality.

## Changes
1. Dashboard first cell (current timeframe) now shows score tile instead of TF label:
- Format: `Sx/max` with directional marker.
- Background still reflects bias/strength color.

2. Added detailed bias tooltip generator:
- Shows live values for close, EMA50, RSI, ADX, VWAP, and structure state.
- Shows PASS/FAIL per active factor and OFF for disabled factors.
- Added note constants for each factor to make explanations editable without hardcoded text edits in logic.

3. Added HTF factor-value series so each dashboard cell tooltip uses that timeframe's own values.

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_180826_v1.2.2_dashboard_score_tooltip_pre_refactor`

## Files Updated
- `/Users/macmini/Trade/Bot/Hung Bot/src/_2_ICT-SMC-PA All-in-one2.pine`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/features/BIAS_CONFLUENCE_CHECKBOX_ENGINE.md`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/schedule/ROADMAP.md`
