# Master Plan Status

## Phase A - Performance Stabilization
- Status: DONE
- Goal: Reduce intrabar recomputation without changing trade logic.
- Latest checkpoints:
  - MSS: `0326-13`
  - SMC: `0326-12`

## Phase B - Score/Limitation Simplification
- Status: DONE
- Goal: Remove low-value soft confluence scoring while keeping hard-risk and trade-score gates.
- Latest checkpoint:
  - SMC: `0326-15`
- Note:
  - MSS reviewed in pass-3; no behavior-neutral soft-confluence branch found to remove safely.

## Phase C - Settings/Dead-Field Cleanup
- Status: DONE
- Goal: Remove dead fields/branches and keep backward-safe behavior.
- Latest checkpoint:
  - SMC: `0326-17`
  - MSS: `0326-18`
- Closeout:
  - Dead fields/branches removed in SMC and MSS with behavior-neutral constraint.
  - Phase frozen after final sweep.

## Current src heads
- `src/Hung - MSS.pine` -> `@file-version: 0326-61`
- `src/Hung - SMC.pine` -> `@file-version: 0326-61`
- `src/Hung - Core.pine` -> `@file-version: 0326-61`

## Phase D - Risk/Entry Simplification
- Status: DONE
- Order executed: D3 -> D1 -> D2
- D3:
  - Continued settings cleanup by removing unreachable config paths in MSS.
- D1:
  - Risk model simplified to `% of zone height` in SMC and MSS (`Risk% Zone`).
  - Removed dependency on multi-parameter gap/score risk gates in SMC entry builder.
- D2:
  - Reduced noise defaults:
    - SMC `SW Sweep` default -> `false`
    - MSS `SW>MS>FVG` default -> `false`

## Phase E - Bias Dashboard Local Semantics
- Status: DONE
- Requirements locked (2026-03-26):
  - Bias Dashboard background must follow MSS Trend direction (source of truth).
  - Bias Dashboard arrow symbol must represent short-term bias from local method `get_bias_data()` in each indicator.
  - `get_bias_data()` can share the same name but logic is indicator-local:
    - Core: legacy-style bias formula (RSI + CP + VWAP blend).
    - SMC: structure-oriented local bias (signal memory + trend/bias fallback).
    - MSS: BOS/MSS/Sweep-nearest oriented bias (signal memory + sweep recency + trend/bias fallback).
- Delivery (0326-42):
  - Replaced shared bias-row drawer usage with local draw methods in Core/SMC/MSS.
  - Dashboard cell background is trend-derived (`ctx.dir*`) as source of truth.
  - Dashboard arrow symbol is now local short-bias per indicator (`get_bias_data()` local logic).
  - Added explicit tooltip semantics: `BG:MSS Trend | Arrow:<Local Bias>`.

## One-pass 0326-49 (Item 1 + 3)
- Status: DONE
- 1) Dashboard counting now follows chart-visible trades:
  - Added local `UI_collect_dashboard_trades(...)` in Core/SMC/MSS.
  - Filters by state toggles (`Pending/Start/TP/SL`) + lookback window before dashboard render.
- 3) Core stoploss anchor strengthened:
  - Added `CORE_get_sl_anchor_from_swings(...)` and integrated into strategy entry flow.
  - SL anchor now respects nearest structural swing before risk-gap expansion.
- Safety fix:
  - Core risk-gap floors now have deterministic defaults when `Dynamic TP/SL` is disabled.

## One-pass 0326-50 (EntryModel Dynamic Foundation)
- Status: DONE
- Added local schema-driven dynamic config methods with shared signature:
  - `CORE_get_entry_model_dynamic_cfg(...)`, `CORE_check_entry_model_dynamic(...)`
  - `SMC_get_entry_model_dynamic_cfg(...)`, `SMC_check_entry_model_dynamic(...)`
  - `MSS_get_entry_model_dynamic_cfg(...)`, `MSS_check_entry_model_dynamic(...)`
- Bridge behavior:
  - Defaults are mapped from existing `3. Trade Config` settings (no hard behavior break expected).
  - RR / bias-mode / max-active / risk% now read through model-dynamic config path.
- Integrated checks:
  - Core trigger queue now gates per-model by dynamic checker and model RR.
  - SMC/MSS entry add flow now gates via dynamic checker and consumes model RR/risk/entry-point config.

## One-pass 0326-52 (Per-model Defaults + Required Events Parser)
- Status: DONE
- 1) Per-model defaults (bridge removed):
  - Core/SMC/MSS dynamic cfg methods now map by real model key/strategy id.
  - RR, entry-point, bias modes, max-active, risk% are now model-specific defaults.
- 2) `required_previous_events` parser:
  - Added token list parser with delimiter normalization (`,`, `|`, `+`, `;`, `/`) and alias support (`MS->MSS`, `BO->BOS`, `SW->SWEEP`).
  - Added configurable required-event lookback window per model in dynamic cfg.
- 3) Start reducing global `3. Trade Config`:
  - SMC/MSS entry flow now relies on model dynamic checker + side toggle; no longer depends on legacy global bias gate in add-entry.
  - Global Trade Config remains as compatibility surface for one stabilization cycle before further removal.

## One-pass 0326-53 (Schema Lift To EntryModelDef)
- Status: DONE
- `EntryModelDef` schema expanded at type level (Kit Core) with dynamic trade fields:
  - `rr`, `entry_point`, `bias_ltf`, `bias_htf1`, `bias_htf2`, `required_previous_events`, `required_window_bars`, `bias_direction`, `max_active`, `dynamic_tp_sl`, `risk_zone_pct`, `entry_mode`.
- Per-model defaults moved from local switch/if mapping into `process_data_init_strategy_defs()` entries in Core/SMC/MSS.
- Dynamic cfg readers now load directly from `strategyDefs` schema, no hardcoded per-model switch map.
- Queue migration:
  - SMC/MSS event queue now reads per-model `entry_mode` from schema (`NO ENTRY / LIMIT / AFTER RETEST`) instead of global entry mode switch.

## One-pass 0326-54 (Prefix Hygiene For Local Helpers)
- Status: DONE
- Rule applied: methods not identical across all indicators are treated as local helpers, not KIT-copied helpers.
- Renamed non-shared prefixed methods:
  - Core: removed `CORE_*`/local `UI_draw_*` prefixes from local-only helpers.
  - SMC: removed local `SMC_*` and local `UI_draw_*` prefixes from non-shared helpers.
  - MSS: renamed local bias/draw helpers to neutral local names.
- Kept `UI_*` only for methods that are currently identical across all 3 files:
  - `UI_get_bias_bg_from_trend`
  - `UI_get_bias_symbol`
  - `UI_collect_dashboard_trades`
- Validation:
  - No `get_bias_data` method exists in KIT (`Kit - Core`, `Kit - UI`), so no KIT removal needed.

## One-pass 0326-55 (Move Shared UI Helpers To KIT)
- Status: DONE
- Moved shared-identical helpers into `Kit - UI`:
  - `UI.get_bias_bg_from_trend(int trendDir, CORE.Theme theme)`
  - `UI.get_bias_symbol(int biasDir, CORE.Const c)`
  - `UI.collect_dashboard_trades(...)`
- Updated Core/SMC/MSS call-sites to consume KIT helpers with explicit `THEME/CONST`.
- Removed local duplicate definitions of these three helpers from Core/SMC/MSS.

## One-pass 0326-58 (Trade Config Demoted To Legacy Compat Group)
- Status: DONE
- Scope:
  - Core/SMC/MSS moved global trade controls from visible group `3. Trade Config` to `9. Legacy Trade Config (Compat)`.
  - No trade logic changes in this pass; this is a settings-surface cleanup to prepare full model-schema control.
- Result:
  - Active user-facing flow is now clearer: model-level controls stay primary; legacy globals are explicitly marked compatibility-only.

## One-pass 0326-59 (Remove Unused Legacy Trade Inputs In SMC/MSS)
- Status: DONE
- Scope:
  - Removed unused legacy settings from SMC/MSS:
    - `signalEntryMode`
    - `signalRiskZonePct`
- Result:
  - Smaller settings surface without logic impact (both fields had no runtime reads).

## One-pass 0326-60 (SMC/MSS EntryModelDef-Only RR/EntryPoint)
- Status: DONE
- Scope:
  - Removed remaining runtime fallback reads from legacy global controls in SMC/MSS entry execution path:
    - RR now reads directly from `EntryModelDef.rr` (no global RR fallback).
    - SMC entry point mode now reads directly from `EntryModelDef.entry_point` (no legacy edge/middle/end toggle fallback).
  - Removed now-unused legacy inputs:
    - SMC: `signalRrInput`, `signalEntryAtEdge`, `signalEntryAtMiddle`, `signalEntryAtEnd`
    - MSS: `signalRrInput`
- Result:
  - Entry execution path is now closer to schema-only behavior with lower settings noise and fewer fallback branches.

## One-pass 0326-61 (Final Cleanup Pass: Directional Legacy Removal + Core Trim)
- Status: DONE
- Scope:
  - SMC/MSS:
    - Removed remaining legacy directional filter settings (`signalFilterBias*`, `signalFilterLong/Short`).
    - Runtime directional gating is now schema/event-memory based; no global directional toggle branch.
  - Core:
    - Removed legacy global filters from settings/runtime (`entryFilterBias`, `entryFilterLong`, `entryFilterShort`).
    - Removed legacy global RR input (`entryRrInput`); trigger queue already consumes per-model RR from schema.
    - Simplified trigger queue signature by removing unused `rrInput` parameter.
- Result:
  - Cleanup branch completed with reduced global-trade-config surface and fewer runtime fallback branches.
  - Remaining Core compat controls are risk-shape controls (`entryDynamicTp`, `signalSlProfile`, `signalGapRiskPct`) and global max-active cap (`entryMaxStart`).
