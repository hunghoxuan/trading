# Candle Pattern Confluence

## Progress
- Status: Implemented (pending multi-symbol tuning)
- Last Updated: 2026-03-01

## Requirement
- Detect candle patterns through a reusable method and use them as confluence supplements, not standalone entry triggers.
- Reduce noise by awarding score only when pattern direction aligns with signal event direction.

## Business Logic
- Core method:
- `get_candle_pattern()` returns enum-style pattern constants.
- Supported patterns include:
- Engulfing, Harami, Hammer, Shooting Star, Doji (neutral), Dragonfly/Gravestone Doji
- Piercing Line / Dark Cloud
- Tweezer Top / Bottom
- Marubozu (bull/bear)
- 3 White Soldiers / 3 Black Crows
- Morning Star / Evening Star
- Safety:
- Uses `barstate.isconfirmed` for close-only pattern detection.
- Uses mintick-safe denominators for wick/body ratios.
- Uses ATR-relative tolerance for tweezers.
- Confluence integration:
- `apply_candle_pattern_confluence(direction, reason, baseScore)` adds score only for confluence events.
- Confluence events include retest/sweep/respect/confirm reason paths.
- Bonus components:
- Pattern alignment bonus (`SCORE_CANDLE_PATTERN`)
- Relative volume bonus (`SCORE_CANDLE_VOLUME`) when `volume / sma(volume, CP_VOL_LEN) >= CP_VOL_MIN`
- Reason text can append `+ <PatternName>` and `+ Vol`.

## Pattern Definitions (Current Code)
- `Bull Engulfing`: current bullish body engulfs prior bearish body; body must exceed `CP_ENGULF_MIN_PREV_BODY` ratio.
- `Bear Engulfing`: current bearish body engulfs prior bullish body; body must exceed `CP_ENGULF_MIN_PREV_BODY` ratio.
- `Hammer`: non-doji with dominant lower wick (`wick/body` + dominance thresholds), limited upper wick.
- `Shooting Star`: mirror of hammer with dominant upper wick.
- `Dragonfly Doji`: doji body with dominant lower wick (wick ratio thresholds).
- `Gravestone Doji`: doji body with dominant upper wick (wick ratio thresholds).
- `Bull Harami`: bullish body inside prior bearish body.
- `Bear Harami`: bearish body inside prior bullish body.
- `Piercing Line`: bullish close into prior bearish candle above midpoint.
- `Dark Cloud`: bearish close into prior bullish candle below midpoint.
- `Tweezer Top`: local bearish reversal with near-equal highs using ATR-relative tolerance.
- `Tweezer Bottom`: local bullish reversal with near-equal lows using ATR-relative tolerance.
- `Bull Marubozu`: bullish strong body candle with very small wicks (`CP_MARUBOZU_MAX_WICK_BODY`) and high body/range.
- `Bear Marubozu`: bearish mirror of bull marubozu.
- `3 White Soldiers`: 3 bullish candles with rising closes plus body/wick/open-sequencing quality checks.
- `3 Black Crows`: 3 bearish candles with falling closes plus body/wick/open-sequencing quality checks.
- `Morning Star`: 3-candle bullish reversal structure (bear candle, small middle body, bullish recovery above midpoint).
- `Evening Star`: bearish mirror of morning star.
- `Doji`: neutral fallback (small body); no directional bias.

## Pattern Direction Map (Used by Confluence)
- Bullish patterns (`get_candle_pattern_bias() = 1`):
- `Bull Engulfing`
- `Hammer`
- `Dragonfly Doji`
- `Bull Harami`
- `Piercing Line`
- `Tweezer Bottom`
- `Bull Marubozu`
- `3 White Soldiers`
- `Morning Star`
- Bearish patterns (`get_candle_pattern_bias() = -1`):
- `Bear Engulfing`
- `Shooting Star`
- `Gravestone Doji`
- `Bear Harami`
- `Dark Cloud`
- `Tweezer Top`
- `Bear Marubozu`
- `3 Black Crows`
- `Evening Star`
- Neutral (`get_candle_pattern_bias() = 0`):
- `Doji`
- `None`

## Pattern Precedence
- Only one pattern enum is returned per bar.
- Precedence is fixed by detection order in code (first match wins), starting with:
- Engulfing -> Hammer/Star -> Dragonfly/Gravestone -> Harami -> Piercing/DarkCloud -> Tweezers -> Marubozu -> 3-candle patterns -> Morning/Evening Star -> Doji.

## Confluence Contribution Rules
- Pattern score applies only when:
- event text indicates confluence event (`Retest`, `Sweep`, `respected`, `reclaimed`, `rejected`)
- and pattern directional bias matches signal direction (`Buy` uses bullish patterns, `Sell` uses bearish patterns).
- Pattern bonus: `+SCORE_CANDLE_PATTERN`.
- Volume bonus: `+SCORE_CANDLE_VOLUME` when `relVol >= CP_VOL_MIN`.
- Neutral `Doji` gives no directional bonus.
- Important: volume bonus is event-gated, not direction-gated. On confluence events, high relative volume can still add `+SCORE_CANDLE_VOLUME` even if candle pattern is neutral or opposite.

## Current Limitation / Clarification
- There is no explicit "continuation" pattern class (example: dedicated bullish continuation engulfing in trend context).
- The engine is event-driven: candle pattern only supplements existing SMC event logic (`Retest`, `Sweep`, `respected`, `reclaimed`, `rejected`).
- Because one enum is returned per bar (first-match precedence), overlapping multi-pattern interpretation is intentionally reduced for noise control.

## Tunable Constants (Code-Level)
- `CP_DOJI_BODY_MAX_PCT`
- `CP_WICK_BODY_MIN`
- `CP_WICK_DOMINANCE_MIN`
- `CP_OPPOSITE_WICK_MAX_BODY`
- `CP_ENGULF_MIN_PREV_BODY`
- `CP_TWEEZER_TOL_ATR`
- `CP_MARUBOZU_MAX_WICK_BODY`
- `CP_3LINE_MIN_BODY_PCT`
- `CP_VOL_LEN`
- `CP_VOL_MIN`

## Test Conditions
- Verify aligned bullish/bearish patterns increment score on retest/sweep/respect/confirm events.
- Verify neutral/unmatched pattern does not add pattern score.
- Verify `+ Vol` suffix appears only when relative volume threshold is met.
- Verify no intrabar repaint contribution (pattern should appear only after bar close).
