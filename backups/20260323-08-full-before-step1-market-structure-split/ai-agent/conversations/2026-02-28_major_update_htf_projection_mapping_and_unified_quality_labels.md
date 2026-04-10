# Major Update Summary (2026-02-28)

## Scope
- Improve HTF projected zone UX and alignment before next feature.
- Target file: `/Users/macmini/Trade/Bot/Hung Bot/src/ict_smc [hung].pine`.

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260228_161533_pre_htf_quality_threshold`

## Implemented
1. HTF extension and mapping improvements:
   - Added `HTF Right Extend Bars` setting.
   - HTF projection boxes now use `xloc.bar_time`.
   - Left edge maps from HTF source candle time (`time[2]` at detected HTF zone event).
   - Right edge extends into future by configurable bars on current chart timeframe.
2. HTF label semantics and colors:
   - Labels now show real HTF value (e.g. `4h OB`, `4h FVG`) instead of generic `HTF`.
   - HTF projected boxes now use neutral background with directional border/text colors (no white text).
3. Unified quality-percent label behavior:
   - Renamed setting to `Show Zone Quality % (All)`.
   - Applied to HTF projected labels and current OB/FVG/RJB labels using shared quality model.

## Trace
- Header bumped to `3.1.0`.
