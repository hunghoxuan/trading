# Major Update Summary (2026-02-27)

## Scope
- Implement phase-1 reusable bias confluence system.
- Reuse same bias outputs in signal gating (HTF + current TF).

## Changes
1. Added `Bias` input group with factor checkboxes:
- Use Structure
- Use EMA50
- Use RSI
- Use ADX
- Use VWAP
- Use RSI Impulse
- Min Confluence Score

2. Refactored `get_trend_data(len)` to confluence scoring model:
- Computes `bullScore`/`bearScore` from enabled factors.
- Produces `[bias, winnerScore, flags]`.

3. Added `get_bias_max_score()` and dynamic normalization:
- `powerPercent` now scales using enabled-factor maximum instead of fixed 30.

4. Added signal confluence layer for current timeframe bias:
- New setting: `Confluence with Current TF Bias`.
- Added helper `is_signal_bias_aligned(...)`.
- `_controlZone(...)` now gates OB/FVG retest pending entries by both:
  - HTF bias (optional)
  - current TF bias (optional)

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_172451_v1.2.1_bias_confluence_engine_pre_refactor`

## Files Updated
- `/Users/macmini/Trade/Bot/Hung Bot/src/_2_ICT-SMC-PA All-in-one2.pine`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/features/BIAS_CONFLUENCE_CHECKBOX_ENGINE.md`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/schedule/ROADMAP.md`
