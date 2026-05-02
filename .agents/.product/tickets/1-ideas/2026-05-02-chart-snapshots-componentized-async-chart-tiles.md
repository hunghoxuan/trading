# Idea: Componentized Async Chart Tiles for Chart Snapshots (Immature)

## Meta
- ID: `FEAT-20260502-ASYNC-CHART-TILES`
- Status: `IDEA`
- Maturity: `IMMATURE / PARKED`
- Priority: `P1` (tentative)
- Requested by: `User`
- Proposed implementer: `Deepseek` (later, after design lock)
- Reviewer/Release: `Codex`

## Reason Moved To Idea
- Design still evolving.
- Refresh behavior and pipeline coupling (`Twelve + snapshot + Claude`) needs final product decision.
- Cache-key strategy and API sequencing need contract lock before coding.

## Current Direction (Draft)
- Move from global multi-timeframe fetch to per-tile independent lifecycle.
- Tile key dimensions: `symbol + timeframe + mode`.
- Keep persisted market cache model centered on `MARKET_DATA:SYMBOL` (all TF under one symbol key).
- Runtime request dedupe can still use per-request key (implementation detail), but persisted cache remains symbol-centered.

## Draft Scope (Not Approved Yet)
- `ChartTile` component with:
  - required: `symbol`, `timeframe`
  - optional: `bars`, `entries`
  - status: `IDLE|LOADING|READY|STALE|ERROR`
  - mode: `Live TV` / `Fixed Data` / `Snapshot`
  - one refresh button, mode-aware pipeline
- Shared fetch manager/hook:
  - in-flight dedupe
  - bounded concurrency
  - cooldown
  - stale-while-revalidate

## Open Design Questions
1. One-button refresh exact behavior for each mode:
   - `Live TV`: iframe reload only?
   - `Fixed Data`: bars/context refresh only?
   - `Snapshot`: bars/context + snapshot + upload + Claude analyze in one flow?
2. Stale policy source of truth and thresholds by timeframe.
3. How to represent long-running snapshot/analyze status per tile.
4. Safety controls to avoid credit burn in snapshot/analyze mode.

## Next Step Before Implementation
- Freeze v1 contract:
  - cache semantics (`MARKET_DATA:SYMBOL`)
  - mode-aware refresh pipeline
  - endpoint sequence and error strategy
- After contract freeze, promote back to `2-backlog` as implementation ticket.
