# Two-File Shared Contract

## Scope
- Core file: `/Users/macmini/Trade/Bot/Hung Bot/src/ict_smc_structure_zones.pine`
- Merged file: `/Users/macmini/Trade/Bot/Hung Bot/src/ict_bias_signals_aux.pine`
- Rule: keep constants/methods/variables only if used by that file; avoid carrying cross-module state.

## Shared Methods (same name/behavior when needed)
1. `is_in_draw_lookback_index`
2. `is_in_draw_lookback_current`
3. `get_strength_color`
4. `get_friendly_tf` (only where timeframe labels are rendered)
5. `format_vol` (only where signal tooltips display volume)

## Shared Detection Helpers (only where needed)
1. `get_detection_series`
2. `check_impulse_filter`
3. `check_break`
4. `check_touch`
5. `check_mitigation`
6. `check_reversal_after_sweep`

## Shared Constants (minimal)
1. Visual/format: `FMT_PRICE`, `FMT_TIME`, `FMT_VOL`
2. Detection: `DETECTION_METHOD_STATE`, `DETECTION_METHOD_CROSS`
3. Minimal symbols/colors used in both modules:
- `SYM_UP`, `SYM_DN`, `SYM_DASH`
- `BULLISH_COLOR`, `BEARISH_COLOR`, `NEUTRAL_COLOR`

## File-Local Types (must NOT be shared globally)
1. Core only:
- `SMC_Zone`
- `ZigZagTracker`
2. Merged only:
- `EntrySignal`
- `Entry`
- `KZ`
- `HTF_Data`

## File-Local Variables (must stay local)
1. Core only:
- `activeZones`, `bullishLiquidity`, `bearishLiquidity`
- `eqHighs`, `eqLows`
- key-level line/label state (PDH/PDL/PWH/PWL)
- `ms_tracker` and related structure state
2. Merged only:
- `pendingEntries`
- killzone instances (`kzAsia`, `kzLondon`, `kzNYAM`, `kzNYPM`)
- HTF candle store (`candle_store`)
- divergence pivot arrays (`ph_positions`, `pl_positions`, `ph_vals`, `pl_vals`)
- dashboard series buffers/cell arrays

## Non-Shared by Design
1. Do not share zone arrays/state across files.
2. Do not share pending-entry arrays across files.
3. Do not share heavy tracker structs across files.
4. Do not keep feature constants from one module inside the other when unused.

## Next Pruning Pass
1. Remove Bias/Dashboard/Signals/Killzones/Divergence/HTF-candle modules from core file.
2. Remove ZigZag/OB/FVG/RJB/Liquidity/EQ/PDH-PDL/PWH-PWL modules from merged file.
3. Keep only the shared contract items listed above when actually used.
