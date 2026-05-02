# Chart Snapshots: Componentized Async Chart Tiles (Plan)

## Goal
Replace monolithic all-timeframe bars/context fetch flow with independent per-chart tiles so each symbol/timeframe chart can load, refresh, and report status without blocking others.

## Problem Today
- One multi-timeframe call can fail/timeout and degrade whole panel.
- Status is global, not per chart.
- Manual refresh control is coarse.
- Provider/network spikes affect all tiles at once.

## Target User Experience
1. Each chart tile is independent (`symbol + timeframe`).
2. Each tile shows its own status:
   - `IDLE`, `LOADING`, `READY`, `STALE`, `ERROR`.
3. Each tile has mode switch:
   - `Live TV`
   - `Fixed Data`
4. Each tile has manual refresh button:
   - fetch latest bars/context
   - persist to cache
5. One failed tile does not block other tiles.

## Architecture

### UI Layer
- New reusable component:
  - `ChartTile`
  - inputs: `symbol`, `timeframe`, `provider`, `mode`
  - outputs: local status + data + errors
- Parent grid:
  - renders many `ChartTile` components
  - holds layout/filter/symbol selection only
  - does not own tile fetch lifecycle

### Data Layer
- Shared client fetch manager (single source):
  - request dedupe by cache key
  - bounded concurrency
  - stale-while-revalidate behavior
  - refresh cooldown to avoid storms
- Cache key convention:
  - `{provider}:{symbol}:{timeframe}:{mode}`

## API / Contract
- Keep existing backend endpoints first (no schema migration required).
- Tile fetch should use existing chart context/bars routes.
- Manual refresh must call fetch path with refresh intent and save response into cache.

## Non-Goals
- No redesign of AI analysis schema.
- No DB schema migration in first rollout.
- No full rewrite of chart page.

## Rollout Plan
1. Add `ChartTile` + fetch manager with feature flag.
2. Render new grid in parallel with existing logic for internal testing.
3. Switch default to tile mode after verification.
4. Remove deprecated global fetch path once stable.

## Acceptance
1. Independent tile load/refresh/status works.
2. Failed tile does not block other tiles.
3. Manual refresh updates cache and status.
4. `Live TV` / `Fixed Data` mode works per tile.
5. No regression in symbol/timeframe workflows.
