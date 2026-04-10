# Swing/Leg Refactor Plan (Scaffold First)

## Objective
- Replace parallel swing ledgers with a single source of truth:
  - `Swing`
  - `SwingLeg`
  - `MarketStructure` (array of legs + swings)
- Keep current behavior stable during migration.

## Data Model
- `Swing`: identity, TF metadata, bar/time/price, side, mitigation, visual handle.
- `SwingLeg`: paired high/low anchors, direction, active flag, break metadata, quality.
- `MarketStructure`: TF identity, swings[], legs[], active/bos/mss pointers, id counters.

## Execution Phases
1. Scaffold in `Kit - Core` (done)
- Add/extend types.
- Add helpers:
  - `market_structure_new`
  - `market_structure_reset`
  - `swing_new`
  - `market_structure_rebuild_from_ledgers`
  - `market_structure_to_legacy_ledgers`

2. Shadow Mode (no behavior change)
- In indicators, keep existing arrays as primary.
- Rebuild `MarketStructure` from legacy arrays each bar.
- Add debug parity counters (swing count, latest high/low, leg count).

3. Write-path Migration
- Update pivot/swing ingest to write to `MarketStructure` first.
- Generate legacy arrays from `MarketStructure` via adapter for downstream logic.

4. Consumer Migration
- MSS/BOS/MSS-reclass consume `legs` and `activeLegId`.
- Liquidity/SR/EQ seeders consume swings from `MarketStructure`.
- PDArray anchoring reads nearest swing/leg from `MarketStructure`.

5. Remove Legacy Arrays
- After parity passes on representative symbols/TFs.
- Remove duplicate ledgers and compatibility adapters.

## Guardrails
- Feature flag: `USE_MS_LEG_ENGINE`.
- Rollback path: keep legacy array pipeline intact until phase 5.
- Validate on 15m and multiple HTF pairs with side-presence checks (above/below).
