# SMC Zones OB FVG RJB

## Progress
- Status: Validated
- Last Updated: 2026-03-12

## Requirement
- Detect and maintain OB/FVG/RJB zones with consistent mitigation and break lifecycle.

## Business Logic
- Zone creation occurs in SMC detection block.
- Supply/Demand (`SD`) detection is active:
  - Demand: `Drop -> Base -> Rally` with base compression and impulse-out filters.
  - Supply: `Rally -> Base -> Drop` with base compression and impulse-out filters.
  - Optional relative-volume filter is applied at impulse candle.
- `_controlZone(...)` manages lifecycle:
  - Stage 0: active and extending
  - Stage 1: mitigated and frozen
  - Stage 2: broken and removed
- Unified detection framework controls break/mitigation behavior:
  - `detection_method` (state vs cross)
  - `detection_sensitivity_basis` (wick/close/body)
  - optional impulse ATR filter
- Canonical overlap merge (OB/SD family):
  - When incoming `SD` overlaps existing `OB` (same side), do not create a second box.
  - Existing zone is updated as canonical `OB` and tagged in label as `+SD` (e.g., `OB-O+SD`).
  - Zone quality/extend can be upgraded, and lifecycle remains single-path (no duplicate signals).
- Zone quality gate + tooltip are unified through `LIB.zone_quality_eval(...)` for:
  - OB
  - FVG
  - RJB
  - SD
  This keeps the size/volume/impulse scoring consistent across all zone families.

## Naming Direction
- Keep area-based structures and line-based structures as separate concepts.
- Current area type `PriceZone` stays separate from line-based `KeyLevel`.
- `KeyLevel` should reuse field names from `PriceZone` where the meaning is the same:
  - `price`
  - `barStart`
  - `barEnd`
  - `isHigh`
  - `mitigated`
  - `broken`
  - `qualityPct`
  - `labelText`
  - `visualLine`
  - `visualLabel`
- Do not force line-only structures into the zone name, and do not rename all zones to key levels.
- `PriceZone` is the current recommended neutral industry-facing name.
- Other acceptable alternatives:
  - `TradingZone`
  - `ReactionZone`
  - `StructureZone`
- Recommended paired model:
  - `PriceZone` for OB/FVG/RJB/SD/BB/iFVG
  - `KeyLevel` for SR/EQ/liquidity/PDH/PDL/PWH/PWL/activeTradingHigh/Low

## Current TF Architecture
The current timeframe uses the full zone engine.

### Primary detection
- `smcIsObUp(...)`, `smcIsObDown(...)`
- `smcIsFvgUp(...)`, `smcIsFvgDown(...)`

### Zone creation / merge
- `add_primary_zone(...)`
- `try_merge_ob_sd_zone(...)`
- `spawn_derived_zone(...)`

### Classification
- `classify_new_ob(...)`
- `ob_label_text(...)`
- `is_extreme_ob_candidate(...)`
- `has_active_ob_same_side(...)`

### Lifecycle manager
- `_controlZone(...)`
- uses `check_mitigation(...)`, `check_zone_respect(...)`, `check_break(...)`

### Signal / entry hooks
- `register_zone_retest_signal(...)`
- `check_signal_confirm(...)`
- `process_break_retest_confirmations(...)`
- `process_sweep_reclaim_confirmations(...)`

## HTF Architecture
HTF zones can now be merged into the full current-TF engine.

### What HTF reuses
- raw OB/FVG pattern detectors:
  - `smcIsObUp(...)`, `smcIsObDown(...)`
  - `smcIsFvgUp(...)`, `smcIsFvgDown(...)`
- zone quality calculation
- projected-zone drawing helper

### What HTF currently uses
- `get_htf_zone_snapshot(...)`
- `get_htf_zone_extend(...)`
- `render_htf_zone_set(...)`
- when `HTF_MERGE_INTO_ACTIVE_ZONES = true`:
  - HTF OB/FVG snapshots are injected into `activeZones` after prune
  - injected zones use normal `type` (`OB` / `FVG`) and TF-prefixed `labelText` (`4h.OB`, `1D.FVG`)
  - projected HTF box layer is disabled to avoid duplicated visuals

### What HTF does not currently use
- `classify_new_ob(...)`
- persistent HTF derived-zone lifecycle (`BB`, `iFVG`) from HTF-origin zones is still intentionally limited

## OB Classification Cost
- `classify_new_ob(...)` is low-cost.
- It runs only when a new OB candidate is created.
- It is not a meaningful performance hotspot compared with:
  - `_controlZone(...)` loops
  - `request.security(...)`
  - HTF candidate selection / projection
  - object updates on boxes/labels/lines

## Why HTF `BB` / `iFVG` Is Expensive
- `BB` and `iFVG` are derived zones, not primary candle patterns.
- To build them correctly on HTF, the script would need:
  - HTF primary zones
  - HTF lifecycle control
  - HTF break detection
  - HTF derived-zone spawning
  - HTF state persistence
- That moves HTF from lightweight projection into a second full zone engine.

## Recommended HTF Expansion Order
1. Add HTF OB subtype/classification first
- low cost
- improves label meaning

2. Add minimal HTF lifecycle hints second
- active / mitigated / broken
- preferably HTF1 only

3. Add HTF derived zones (`BB`, `iFVG`) only after HTF1 lifecycle is stable
- avoid doing this for HTF1 and HTF2 at the same time

## OB Lifecycle In Signal Flow
1. First mitigation
- First valid touch/entry into the OB changes it from active to mitigated.
- This is the earliest point where OB retest setup logic can be registered.

2. Post-mitigation respect
- After mitigation, a later hold/respect of the OB can register another OB-family setup path.

3. Break after mitigation
- If the mitigated OB fails, it can register break-retest continuation logic.
- For bullish/bearish OB failure, the broken zone can also spawn a breaker-block (`BB`) derivative zone.

## Label Strategy
- Zone rendering is label-driven:
  - draw path reads only `labelText`
  - no draw-time hard rewrite based on zone type/state
- OB class labels are normalized to prefix form:
  - `d.OB`, `o.OB`, `x.OB`, `m.OB`
- HTF merged labels use TF prefix and type:
  - `15m.OB`, `4h.FVG`, `1D.OB`

## OB And Entries
- OB box drawing and OB entry generation are separate concerns.
- Turning off `OB Retest` does not remove OB zones from the chart.
- It only disables OB-family setup/entry generation from the signal pipeline.

## Test Conditions
- Verify OB/FVG/RJB creation on expected candles.
- Verify SD zones appear on valid `RBR/DBD` style sequences and do not appear on weak/no-impulse consolidations.
- Verify mitigated zones fade/freeze.
- Verify broken zones are deleted.
- Toggle detection settings and ensure no compile/runtime errors.
- Verify OB+SD overlap produces one zone object (no duplicate box/label).
