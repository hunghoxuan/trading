# Conversation Summary - 2026-02-27 (Structure Debug Counters)

## Scope
- Implemented optional BOS/MSS parity debug counters (non-trading-logic feature).

## What Changed
- Added two inputs:
  - `showStructureDebug`
  - `structureDebugWindowBars`
- Added event counters for:
  - Major BOS
  - Major MSS
  - Minor BOS
  - Minor MSS
- Added top-left debug table with:
  - cumulative totals
  - rolling-window counts (`ta.sum` over configurable bars)

## Safety
- No structural break logic changed.
- Existing BOS/MSS detection behavior preserved.
- Trace header updated with latest backup path.

## Backup Before Edit
- `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_120100_v1.1.2_structure_debug_counters_pre_refactor`
