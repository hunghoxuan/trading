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
- `src/Hung - MSS.pine` -> `@file-version: 0327-8`
- `src/Hung - SMC.pine` -> `@file-version: 0327-8`
- `src/Hung - Core.pine` -> `@file-version: 0327-8`
- `src/Kit - Core.pine` -> `@kit-version: 4`

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

## One-pass 0326-62 (Bias Dashboard Per-TF ShortBias)
- Status: DONE
- Scope:
  - Core/SMC/MSS bias dashboard row now computes symbol per TF cell (not one shared symbol per row).
  - Per-TF short bias source switched to context TF bias slots:
    - `TF0 -> ctx.b0`
    - `15m -> ctx.b15`
    - `4h -> ctx.b240`
    - `1D -> ctx.b1d`
    - `1W -> ctx.b1w`
  - Background logic unchanged: still trend-based per TF from `ctx.dirX` via `UI.get_bias_bg_from_trend(...)`.
  - Removed obsolete local helper `get_data_bias_local(...)` in Core/SMC/MSS.
- Result:
  - Dashboard semantics now match design intent:
    - BG = big direction (trend) per TF.
    - Symbol = short bias per TF.

## One-pass 0327-1 (Fixed-TF Trend Source For Dashboard Context)
- Status: DONE
- Scope:
  - Kept `get_htf_pair()` unchanged (as requested).
  - Updated `Kit - Core` trend context assignment for dashboard-relevant TFs:
    - `ctx.dir15`, `ctx.dir240`, `ctx.dir1d`, `ctx.dir1w` now come from fixed-TF trend source (`request.security` on exact TF), not dynamic `htf1/htf2` slot mapping.
  - Added fixed-TF trend helpers in KIT:
    - `get_ms_trend_dir_fixed_expr()`
    - `get_ms_trend_dir_fixed_tf(string tfName)`
- Result:
  - Dashboard trend BG for fixed TF cells is stable when switching chart timeframe (no slot remap drift through `htf1/htf2`).

## One-pass 0327-2 (First-Cell Fixed Mapping Consistency)
- Status: DONE
- Scope:
  - Core/SMC/MSS dashboard first TF cell now maps trend+bias by TF identity:
    - if current TF is `15/240/1D/1W`, it uses corresponding fixed slots (`ctx.dir15/240/1d/1w`, `ctx.b15/240/1d/1w`) instead of `ctx.dir0/b0`.
    - otherwise keeps `ctx.dir0/b0`.
- Result:
  - Eliminates remaining inconsistency where the same TF (especially `15m`) could show different BG/symbol when it appears as first column vs fixed column.

## One-pass 0327-3 (Arrow Color By ShortBias Direction)
- Status: DONE
- Scope:
  - Core/SMC/MSS dashboard bias-row text/arrow color now follows per-cell short-bias direction:
    - Bullish bias -> `THEME.COLOR_BULLISH`
    - Bearish bias -> `THEME.COLOR_BEARISH`
    - Neutral -> `THEME.COLOR_UI_FG`
- Result:
  - Arrow visual semantics are clearer without changing trend/bias data logic.

## One-pass 0327-4 (Bias Tooltip State Clarity)
- Status: DONE
- Scope:
  - Core/SMC/MSS bias dashboard tooltip now includes per-cell state classification:
    - `Continuation`: trend and short-bias are aligned.
    - `Pullback`: trend and short-bias are opposite.
    - `Neutral`: one side is neutral.
  - Kept existing semantics unchanged:
    - BG still from trend (source of truth).
    - Arrow/symbol still from short-bias.
- Result:
  - Faster visual interpretation of trend-vs-tactical-bias relationship without extra UI noise or object cost.

## One-pass 0327-5 (Bias Mode For Entry Direction Gate)
- Status: DONE
- Scope:
  - Added `Bias Mode` input in `2. Trade Models` for Core/SMC/MSS:
    - `Follow Trend` (default): use trend first, fallback to bias when trend is neutral.
    - `Allow Pullback`: use short bias first, fallback to trend when bias is neutral.
  - Wired this mode into dynamic entry direction checks:
    - Core: `check_entry_direction_by_mode(...)`
    - SMC: `check_entry_direction_by_mode(...)` and trend-priority helper alignment.
    - MSS: `MSS_check_direction_by_mode(...)` and trend-priority helper alignment.
- Result:
  - One switch now controls tactical-vs-structural direction preference consistently across all three indicators without adding heavy compute paths.

## One-pass 0327-6 (Model-Level Bias Mode, Global Removed)
- Status: DONE
- Scope:
  - Removed global `Bias Mode` input from Core/SMC/MSS (`2. Trade Models` cleanup).
  - Direction preference is now resolved per model inside dynamic gate:
    - Core: `get_data_entry_model_allow_pullback(int stratId)`.
    - SMC: `get_data_entry_model_allow_pullback(string modelKey)`.
    - MSS: `MSS_get_entry_model_allow_pullback(string modelKey)`.
  - Updated direction-gate evaluators to consume model-level `allowPullback`:
    - Core: `check_entry_direction_by_mode(..., bool allowPullback)`.
    - SMC: `check_entry_direction_by_mode(..., bool allowPullback)`.
    - MSS: `MSS_check_direction_by_mode(..., bool allowPullback)`.
- Result:
  - No extra global toggle to manage.
  - Entry direction behavior remains configurable by model intent, with lower settings noise.

## One-pass 0327-7 (Intent From EntryModelDef Fields)
- Status: DONE
- Scope:
  - Removed remaining hardcoded model-key mapping for pullback preference in Core/SMC/MSS.
  - Direction preference now derives directly from `EntryModelDef` dynamic modes:
    - `allowPullback = (bias_ltf == 2) or (bias_htf1 == 2) or (bias_htf2 == 2)`
  - Kept gate evaluator shape unchanged (`check_entry_direction_by_mode(..., allowPullback)`).
- Result:
  - Model intent is now fully data-driven by existing `EntryModelDef` fields.
  - Less maintenance drift when adding/changing models.

## One-pass 0327-8 (Macro Cleanup: Dynamic Gate + Legacy Trim)
- Status: DONE
- Scope:
  - Core/SMC/MSS dynamic gate cleanup:
    - Removed no-op reason branch from dynamic checks.
    - Standardized pullback-preference derivation via mode fields (`bias_ltf/htf1/htf2`) through local helper.
    - Optimized required-previous-events check with early break on first missing token.
  - Removed dead helpers:
    - SMC/MSS `allow_direction_with_trend_priority(...)` (unused).
  - Legacy/global setting trim:
    - SMC: removed legacy `Dynamic TP/SL` input toggle and used realized-R stats consistently.
    - MSS: removed legacy `Max Active` and `Dynamic TP/SL` inputs (both were legacy/global), used realized-R stats consistently.
    - MSS removed stale assignments to `chartCfg.dynamicTp/maxStartEntries`.
  - Updated dynamic-check function signatures:
    - Core: `check_entry_model_dynamic(int stratId, string direction, int memDir)`.
    - SMC: `check_entry_model_dynamic(string modelKey, string direction, int memDir)`.
    - MSS: `MSS_check_entry_model_dynamic(string modelKey, string direction, int memDir)`.
- Result:
  - Fewer global toggles, less branching, and a cleaner model-driven gate path across all three indicators.
