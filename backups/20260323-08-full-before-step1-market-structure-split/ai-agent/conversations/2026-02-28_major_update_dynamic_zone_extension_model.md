# Major Update Summary (2026-02-28)

## Scope
- Replace static zone extension by dynamic formula and simplify labels.
- Target file: `/Users/macmini/Trade/Bot/Hung Bot/src/ict_smc [hung].pine`.

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260228_161533_pre_htf_quality_threshold`

## Implemented
1. Dynamic zone extension model:
   - New formula uses: timeframe factor + type factor + power factor.
   - Timeframe bonus: current TF = 0, HTF = 10.
   - Type bonus: FVG = 0, OB/RJB = 5.
   - Power bonus: mapped from quality percent to 0..2.
2. Shared extension helpers added:
   - `get_zone_type_extend_bonus(...)`
   - `get_zone_power_extend(...)`
   - `get_zone_extend_bars(...)`
3. Local zones now use dynamic extension at creation and runtime:
   - Computed once from quality percent.
   - Stored in new `SMC_Zone.extendBars` field.
   - `_controlZone(...)` uses stored extension directly.
4. HTF projected zones now use dynamic extension too:
   - `update_projected_box(...)` takes computed `extendBars`.
   - Left mapping still uses HTF source candle time.
5. Removed quality `%` from labels:
   - Local OB/FVG/RJB labels no longer append percentages.
   - HTF labels now show clear TF + type text only (e.g. `4h FVG`).
6. HTF label clarity improved:
   - Consistent directional text colors.
   - Stronger directional border, neutral background.
   - Larger text size for HTF projected labels.

## Trace
- Header bumped to `3.2.0`.
