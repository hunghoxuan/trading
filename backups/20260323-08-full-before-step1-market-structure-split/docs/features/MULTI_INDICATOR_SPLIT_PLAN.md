# Multi Indicator Split Plan (3 Files)

## Progress
- Status: Planned (ready to implement)
- Source analyzed: `/Users/macmini/Trade/Bot/Hung Bot/src/_2_ICT-SMC-PA All-in-one2.pine`
- Goal: split into 3 indicators with minimal cross-dependency and minimal duplicated core logic.

## Recommended Target Files

1. `ict_smc_structure_zones.pine`
- Indicator name: `ICT SMC Core (Structure + Zones)`
- Scope:
  - ZigZag / BOS / MSS (major + minor)
  - OB / FVG / RJB detection + state transitions
  - Key levels + liquidity levels (PDH/PDL/PWH/PWL, EQH/EQL, sweeps)
  - Trend lines (structure visual)

2. `ict_bias_dashboard.pine`
- Indicator name: `ICT Bias Dashboard`
- Scope:
  - Bias factor calculation and weighted confluence
  - HTF bias aggregation
  - Bias + Buy/Sell dashboard rendering and detailed tooltips
  - Optional lightweight context markers (VWAP/RSI icons)

3. `ict_signals_sessions_aux.pine`
- Indicator name: `ICT Execution + Sessions`
- Scope:
  - Pending entry + confirmation pipeline
  - Alert payload generation
  - Killzones
  - HTF candle mini-overlay
  - Divergence module

## Exact Move Map (Methods / Types)

### To `ict_smc_structure_zones.pine`
- Types:
  - `SMC_Zone`
  - `ZigZagTracker`
- Methods/functions:
  - `smcIsUp`, `smcIsDown`, `smcIsObUp`, `smcIsObDown`, `smcIsFvgUp`, `smcIsFvgDown`
  - `get_detection_series`, `check_impulse_filter`, `check_break`, `check_touch`, `check_mitigation`, `check_reversal_after_sweep`
  - `calc_zigzag_inputs`, `get_trend_state`
  - `init_tracker`, `process_zigzag`
  - `create_bearish_liquidity`, `create_bullish_liquidity`, `update_liquidity`, `execute_liquidity_logic`
  - `execute_trend_lines`
  - `is_valid_eq_candle`, `find_equal_high`, `find_equal_low`, `update_eq_levels`, `execute_eq_logic`
  - PDH/PDL/PWH/PWL drawing section
- State vars:
  - zone arrays, eq arrays, zigzag tracker, trendline handles, keylevel line/label handles

### To `ict_bias_dashboard.pine`
- Types:
  - none required from SMC module (keep it stateless around local series)
- Methods/functions:
  - `get_bias_max_score`, `get_effective_bias_min_pct`, `get_effective_signal_min_pct`
  - `get_bias_factor_values`, `get_bias_factor_scores`, `get_trend_data`, `get_bias_power`
  - `get_htf_n_levels`, `get_friendly_tf`, `get_strength_color`
  - `get_bias_tooltip_detailed`
  - `get_signal_confluence_scores`, `get_signal_tooltip_detailed`
  - `create_dashboard_bias`
  - `build_bias_note` (if still used in tooltip)
- State vars:
  - bias weights/constants, HTF/bias inputs, dashboard table vars

### To `ict_signals_sessions_aux.pine`
- Types:
  - `EntrySignal`
  - `Entry`
  - `KZ`
  - `HTF_Data`
- Methods/functions:
  - `is_signal_bias_aligned`, `has_pending_entry_signal`, `check_signal_confirm`, `detect_entry_signals`
  - `_controlZone` (or split to `get_zone_signal_data` + `draw_zone_signal`)
  - `add_signal`, `add_entry`, `addTooltipIcon`, `send_json_alert`, `format_vol`
  - `notransp`, `manage_kz`
  - `cleanup_arrays`, `render_htf_view`
  - `check_div_all`, `scan_and_draw_div`, `execute_divergence_scan`
- State vars:
  - pending entry array, killzone instances, HTF candle store, divergence pivot buffers

## Minimal Common Surface (Shared/Duplicated)

Keep common as small as possible. Duplicate only these tiny helpers/constants in each file as needed:
- Formatting: `FMT_PRICE`, `FMT_TIME`, `FMT_VOL`
- Draw throttle: `is_in_draw_lookback_index`, `is_in_draw_lookback_current`
- Small style constants: a few colors and symbols used by that file only

Do not share/replicate across all 3 files:
- `SMC_Zone` in non-zone files
- `ZigZagTracker` in non-structure files
- massive global arrays/tables from other modules

## Dependency Rules

1. `ict_smc_structure_zones.pine`
- Must not depend on bias dashboard or signal pipeline internals.
- Emits visual + local state only.

2. `ict_bias_dashboard.pine`
- Must not depend on SMC zone arrays.
- Uses its own trend-state proxy (`get_trend_state`) from pivots/price.

3. `ict_signals_sessions_aux.pine`
- Must not require zone internals from file 1.
- Uses generic levels/flags/conditions from its own logic or chart series.

## Implementation Sequence (Safe)

1. Extract `ict_bias_dashboard.pine` first (lowest risk to core SMC visuals).
2. Extract `ict_signals_sessions_aux.pine` second.
3. Leave remaining logic in `ict_smc_structure_zones.pine` as core.
4. Validate each file independently in TradingView before next extraction.

## 2-File Fallback (if you want fewer files)

1. `ict_smc_engine.pine`
- Structure + zones + liquidity + key levels + trend lines

2. `ict_bias_signals_ui.pine`
- Bias confluence + dashboard + signals + sessions + divergence + alerts

This is simpler operationally, but token pressure remains higher in file 2.
