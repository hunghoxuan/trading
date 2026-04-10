# Changelog

## 2026-02-27
- Validated unified detection framework in TradingView.
- Added detection controls:
  - method (`state` vs `cross`)
  - basis (`wick/close/body`)
  - impulse ATR filter
- Integrated unified checks into:
  - zone lifecycle (`_controlZone`)
  - liquidity sweeps
  - EQH/EQL break checks
- Reorganized workspace docs:
  - `ai-agent/` moved to reusable top-level folder
  - `docs/` kept project-specific
- Finalized docs indexing and navigation:
  - `docs/features/INDEX.md`
  - `docs/references/INDEX.md`
  - `docs/schedule/INDEX.md`
- Normalized reference filenames to consistent `lowercase_snake_case`.

## 2026-02-26
- Restored BOS/MSS display behavior to match legacy working baseline.
- Stabilized ZigZag structure behavior after refactor regressions.

## 2026-02-22
- Added divergence icon-based output and tooltip upgrades.

## 2026-02-27 (Update)
- Added optional market-structure debug counters table:
  - cumulative + rolling-window counts for major/minor BOS/MSS
  - controlled by `showStructureDebug` and `structureDebugWindowBars`
- Added source trace header update with latest backup reference.

## 2026-02-27 (Update - Label Priority)
- Increased label capacity and introduced auxiliary-label gating to reduce BOS/MSS label starvation.
- Added `showAuxiliaryIcons` for quick isolation of non-structure labels.

## 2026-02-27 (Update - Input Group Cleanup)
- Removed temporary structure debug controls/table.
- Moved global controls to `Settings`:
  - `Show Execution Icons (s,w,h,f)`
  - `Show Auxiliary Icons/Tooltip Labels`
- Moved `EQH/EQL` and `Key Levels` input groups under `ICT/SMC` with concise inline rows.
