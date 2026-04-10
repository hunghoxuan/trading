# Bias Confluence Checkbox Engine

## Progress
- Status: In Progress
- Owner: AI Agent + User
- Last Updated: 2026-02-27

## Requirement
- Business objective: Make bias/trend decision configurable and explainable by allowing users to select which confluence factors are active.
- User-facing behavior: Users enable/disable factors (Structure, EMA, RSI, ADX, VWAP, optional extras) and define minimum confluence score to mark bullish/bearish bias.
- Constraints:
- Keep current default behavior equivalent to existing script unless user changes checkboxes.
- Must remain fast on lower timeframes.
- Must not break current dashboard, HTF bias aggregation, and signal filters.

## Business Logic
- Inputs/settings:
- Add per-factor enable toggles (`use_bias_structure`, `use_bias_ema50`, `use_bias_rsi`, `use_bias_adx`, `use_bias_vwap`).
- Add optional factor toggles for future methods (`use_bias_ma_cross`, `use_bias_macd_zero`, etc.) default OFF.
- Add scoring controls:
- `bias_min_bull_score`, `bias_min_bear_score`
- optional per-factor weights (simple ints; default mirrors current weight importance).
- Core detection/decision rules:
- Compute all factors once per bar.
- Only enabled factors contribute to score.
- Normalize to directional bull/bear points and confidence percent.
- Produce final bias: `1`, `0`, `-1` from enabled-factor score thresholds.
- Output/drawing/alerts:
- Dashboard shows:
- enabled factors count,
- bull/bear score,
- final bias and confidence.
- Signal gating (`uUseTrendFilter`) consumes the new final bias value.
- Dependencies:
- `get_trend_state()` / structure state source.
- Existing EMA/RSI/ADX/VWAP computations.
- Existing dashboard and HTF aggregation pipeline.

## Current Implementation Snapshot
- Added `Bias` setting group with factor toggles:
- `Use Structure`, `Use EMA50`, `Use RSI`, `Use ADX`, `Use VWAP`, `Use RSI Impulse`
- Added `Min Confluence Score`.
- Refactored `get_trend_data(...)` to score bullish/bearish confluence from enabled factors.
- Added `get_bias_max_score()` and dynamic `powerPercent` normalization based on enabled factors.
- Added signal-layer current-TF bias filter toggle:
- `Confluence with Current TF Bias`
- Updated `_controlZone(...)` gating to require alignment with:
- HTF bias (if enabled),
- current TF bias (if enabled).
- Dashboard update:
- Current-TF column now displays score tile (`Sx/max`) instead of timeframe label.
- Tooltip now includes live factor values (Structure state, EMA50, RSI, ADX, VWAP, close) and constant-based learning notes.
- Phase-2 optional factors added (default OFF):
- `Use EMA20/50`
- `Use MACD Zero`
- `Use BB Walk` (+ `BB Length`, `BB Mult`, `BB Walk Tol`)
- Reusability refactor:
- `get_bias_factor_values(...)` now serves both bias scoring and dashboard tooltip value extraction to avoid duplicated indicator calculations.
- Signed score model update:
- Each enabled indicator contributes `+1` (bullish) / `-1` (bearish); disabled contributes `0`.
- Trend/Bias total and Buy/Sell total both use `total/max -> %` presentation.
- Tooltips now show indicator-level score plus short condition explanation with live values.
- Weighted score model update:
- Not all factors are equal now; weighted impact is applied (e.g., Structure and VWAP higher than minor filters).
- Factor names include score weight in settings labels (example: `Use RSI (1)`).
- BB Walk settings simplified: one switch (`Use BB Walk`) while length/mult/tolerance use fixed defaults for cleaner UX.
- Removed manual `Min Confluence Score` input; threshold is now auto-derived from active max score.
- Added tunable ranges for core bias factors (EMA lengths, RSI thresholds, ADX threshold) and buy/sell trigger ranges (sweep lookback, trigger persistence).
- Latest UX + logic refinement:
- Added profile selector (`Custom`, `Scalp`, `Intraday`, `Swing`) that controls effective min score % thresholds.
- Trend/Bias and Buy/Sell tooltips are now compact and show factor weight in parentheses.
- Added shared Buy/Sell score gate to zone retest entry creation using the same confluence score engine as dashboard.
- New bias factors added:
- Supertrend (default ON)
- Donchian (default ON)
- Heikin-Ashi regime (default OFF)
- All new thresholds/lengths are defined as top-of-file inputs/constants.

## Test Conditions
- Compile checks:
- No Pine compile errors with all toggles combinations.
- Scenario checks:
- With only Structure ON, bias follows structure breaks only.
- With all current factors ON, result matches legacy baseline closely.
- With strict thresholds, neutral bias appears more often.
- Regression checks:
- HTF table still renders and updates.
- OB/FVG/Liquidity signal gating still works with `uUseTrendFilter`.
- Pass criteria:
- Bias output is deterministic, explainable, and user-configurable without breaking existing features.

## Known Risks / Notes
- Too many toggles can overfit and reduce practical consistency.
- Some external methods (Ichimoku, Volume Profile POC migration) are heavy or unavailable in Pine without major complexity; keep as phase-2 optional.
