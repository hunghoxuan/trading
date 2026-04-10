# Project Terminology / Vocabulary (Initial)

This file maps common terms/aliases used in this project chat so requirements are interpreted consistently.

## A. Workflow & Collaboration
- `one-pass`: deliver one meaningful package end-to-end (code + verify + snapshot + next actions).
- `overnight mode` / `BIG-PASS`: auto-continue packages without waiting, ask only when blocked/ambiguous.
- `next` / `ok next` / `tiếp`: continue immediately to next planned package.
- `compile ok`: user confirmed no compile errors on current version.
- `mốc feature`: checkpoint before/after a feature, usually with backup snapshot.
- `backup order`: preferred order of versions to test/compare.
- `roadmap sync`: update active sprint/plan docs to match current implementation state.

## B. Versioning & Snapshot
- `@file-version`: version tag in file header.
- `version format MMdd-{index}`: daily index increments from 1 each day.
- `src`: must always contain latest working code.
- `src-versions/MMdd-{index}`: immutable snapshot folder for testing.
- `whats-done.md`: mandatory changelog for each snapshot package.

## C. Runtime Window / History
- `first bar` / `working first bar`: left boundary of active processing window.
- `working zone`: `[workingFirstBar, bar_index]`.
- `WORKING_MAX_BARS`: active processing window length.
- `max_bars_back`: Pine history buffer (compile/runtime safety), not business logic window.
- `bar-only limit`: prefer limiting by working bars instead of multiple object caps.

## D. Market Structure & Bias
- `BOS`: Break of Structure.
- `MSS`: Market Structure Shift.
- `Sweep`: liquidity sweep/reclaim event.
- `short bias`: short-term directional bias per timeframe cell (dashboard symbol).
- `trend` / `MSS trend`: larger directional context per timeframe (dashboard background).
- `source of truth`: canonical source for a value (e.g., BG color from MSS trend).
- `trend > bias entry gate`: if trend exists use trend, else fallback bias.
- `confluence floor`: minimum confluence score guard; can block entries if too strict.

## E. PD Arrays / Levels / Liquidity
- `PDArray`: generic zone/level object used for OB/FVG/SD/etc.
- `OB`: Order Block.
- `FVG`: Fair Value Gap.
- `iFVG` / `IFVG`: Inverted Fair Value Gap.
- `RJB`: Rejection Block.
- `BB`: Breaker Block.
- `SD`: Supply/Demand zone.
- `SR`: Support/Resistance level.
- `EQH` / `EQL`: Equal High / Equal Low.
- `$`: higher-timeframe liquidity marker.
- `idm`: internal dealing range liquidity marker.
- `cross`: level violation/touch event; often used to hide/reclassify labels.
- `X marker`: invalidation marker for previous BOS/MSS interpretation.

## F. Timeframe Semantics
- `LTF`: current/lower timeframe context.
- `HTF1`, `HTF2`, `HTF3`: higher timeframe levels above current chart timeframe.
- `get_htf_pair`: function returning dynamic HTF pair for the current chart TF.
- `fixed ladder`: fixed display set (example: `15m`, `4h`, `1D`, `1W`) independent of dynamic pair.
- `consistency issue`: same TF label showing different meaning across chart TF changes.

## G. Entry / Trade System
- `Entry Model`: typed config that defines entry conditions/defaults.
- `trigger type`: `Signal` or `Trade`.
- `trigger when`: `Touch` or `Retest`.
- `entry mode`: `NO ENTRY`, `LIMIT`, `AFTER RETEST`.
- `RR`: risk-reward multiplier.
- `dynamic TP/SL`: adaptive TP/SL behavior by context/model.
- `required_previous_events`: prerequisite event tokens before allowing entry.
- `Entry Engine`: master on/off switch for detect + emit + draw entry/trade.

## H. Performance & Cache
- `hot path`: frequently called code path with highest runtime impact.
- `per-bar cache`: cache valid only for current bar; reset/refresh on new bar.
- `time->bar cache`: cached mapping for `closest_bar_index_from_time`.
- `FVG-between cache`: cached scan result for `get_data_first_fvg_between`.
- `cache scope`: lifetime boundary for cache keys/values (bar/session/tf-symbol).
- `recalc from scratch`: expected behavior when symbol/TF/context changes.

## I. KIT vs Local Methods
- `KIT`: shared imported libraries (`KitCore`, `KitUI`, `KitSMC`).
- `local clone method`: copied KIT method edited locally first for safe customization.
- `CORE_`, `SMC_`, `UI_` prefix: naming convention used when cloning KIT-like helpers locally.
- `promote to KIT`: move stabilized local behavior back to shared KIT.
- `KIT version mismatch`: API/signature mismatch risk; must confirm before fixing.

## J. UI / Dashboard Semantics
- `Bias Dashboard`: compact TF cells with BG + arrow/symbol.
- `BG color`: represents trend direction (big direction).
- `symbol/arrow`: represents short bias (small direction).
- `overlap handling`: resolve text/marker collisions, often prioritize HTF.
- `label position`: left/middle/right + above/center/below controls.
- `HTF overlap` / `overlap 2 HTF layers` (user-defined): **co-registered HTF layers**.
  Required meaning:
  - `top HTF1 = top HTF2`
  - `bottom HTF1 = bottom HTF2`
  - `start HTF1 = start HTF2`
  - `end HTF1 = end HTF2`
  - only internal granularity differs (`HTF2` candle step larger than `HTF1`).
  Non-meaning:
  - not “intersection area”,
  - not “separate adjacent boxes”,
  - not “two boxes with different X span”.
- `locked HTF overlay`: synonym of the user-defined HTF overlap above.
- `co-registered HTF zone`: synonym of locked HTF overlay.

## K. Vietnamese Aliases (Chat)
- `chạy xong`: completed.
- `tổng hợp`: aggregate/inventory.
- `giản lược`: simplify/remove non-essential logic.
- `không đợi confirm`: proceed without waiting for confirmation.
- `làm luôn`: execute immediately.
- `chồng lấp 2 HTF`: same as **locked HTF overlay** (equal top/bottom/start/end).
