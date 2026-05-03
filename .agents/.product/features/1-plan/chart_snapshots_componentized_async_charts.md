# Chart Snapshots: Componentized Async Chart Tiles (Plan)

## Status: IN PROGRESS

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
   - `Snapshot`
4. Each tile has manual refresh button:
   - fetch latest bars/context for ALL TFs
   - create snapshots + upload to Claude
   - persist to shared cache (single `{SYMBOL}` key)
5. One failed tile does not block other tiles.
6. Symbol select reads from same shared cache — no redundant re-fetch.

## Architecture

### UI Layer
- New component: `SymbolChart` (file: `ChartTile.jsx`)
  - inputs: `symbol`, `timeframe`, `allTfs`, `bars?`, `snapshot_file_id?`, `snapshot_file_name?`, `cached_time?`, `defaultMode`
  - outputs: `{ status, bars, snapshot, cachedTime, error, refresh }`
  - reuses existing `TradeSignalChart` for chart rendering
- Parent grid in `ChartSnapshotsPage` renders many `SymbolChart` components
  - holds layout/filter/symbol selection only
  - does not own tile fetch lifecycle

### Data Layer
- Shared client fetch manager (`chartFetchManager.js`):
  - **Cache key**: `{SYMBOL}` only (e.g. `EURUSD`) — single master object per symbol
  - Master object shape: `{ symbol, cached_at, bars: { [tf]: [...] }, context: { [tf]: {...} }, snapshots: { [tf]: { file_id, file_name, uploaded_at } } }`
  - Read-Modify-Write: refresh → parse master → replace TF data → store updated master
  - Aligns with backend `MARKET_DATA:{SYMBOL}` contract
  - In-flight dedupe key: `{symbol}:{tf}` (runtime coordination only)
  - Bounded concurrency (4)
  - Refresh cooldown (2.5 s)
  - Stale-while-revalidate

### Cache Architecture
```
chartFetchManager.masterCache

Key: "EURUSD"
Value: {
  symbol: "EURUSD",
  cached_at: 1714723200000,
  source: "chart_refresh",
  bars:       { "d": [...], "4h": [...], "15m": [...], "5m": [...] },
  context:    { "4h": { last_price, summary, freshness }, ... },
  snapshots:  { "4h": { file_name, file_path, uploaded_at }, ... },
}
```

### API / Contract
- `api.chartRefresh()` → `POST /v2/chart/refresh` — one call for ALL TFs, ALL types
  - `types: ["context","bars","snapshots"]` — single request handles everything
- `api.claudeUploadSnapshots()` — upload snapshots to Claude Files API (no analysis)
- Snapshot metadata stored in backend `market_data.metadata` JSONB column (Solution 2)
- No DB schema migration required

### Pipelines (Parallel)
```
Refresh clicked on EURUSD 4h SymbolChart:

  CHECK CACHE: chartFetchManager.getTf("EURUSD", "4h")
    → if fresh: show READY immediately, done
    → if stale: show STALE, background refresh
    → if missing: show LOADING, full fetch

  ONE API CALL (parallel internally):
    api.chartRefresh({
      symbols: ["EURUSD"],
      timeframes: ["D","4h","15m","5m"],  // ALL TFs
      types: ["context","bars","snapshots"] // ALL types
    })
    → Backend fetches Twelve Data, creates snapshots, returns everything

  IF SNAPSHOT MODE:
    api.claudeUploadSnapshots({ files: [...] })
    → Upload snapshots to Claude server
    → Store file_id in master cache snapshots map

  MERGE → master cache updated → status: READY
```

### Modes (Display Only — Cache is Shared)
| Mode | Display | Refresh Behavior |
|------|---------|-----------------|
| Live TV | TradingView iframe | Rebind iframe only |
| Fixed Data | TradeSignalChart (bars) | Fetch ALL TFs via chartRefresh |
| Snapshot | TradeSignalChart + snapshot bar | Fixed Data pipeline + Claude upload |

Modes share the same cache. Switching modes after data is cached does NOT re-fetch.

## Non-Goals
- No redesign of AI analysis schema.
- No DB schema migration (use existing `metadata` JSONB column).
- No full rewrite of chart page.
- Claude analysis (not yet — schema TBD).

## Implemented
- [x] `chartFetchManager` — single `{SYMBOL}` cache key, master object, RMW merge, `get()/getTf()/isFresh()`
- [x] `useSymbolChartData` hook — parallel fetchAll, cache-first, snapshot pipeline
- [x] `SymbolChart` component — renamed from ChartTile, exposes bars/snapshot/cachedTime, removes provider
- [x] `ChartSnapshotsPage` — imports SymbolChart, uses in browser grid
- [x] Build passes, deployed

## Follow-up
- [x] Page warmup reads from `chartFetchManager` before API calls — skips context fetch if `isFresh()`
- [x] Backend stores `file_id` from Claude response in `market_data.metadata` (done — `repoUpsertUnifiedMarketData` snapshot field)
- [ ] Snapshot mode pipeline returns actual `file_id` from Claude upload response
- [ ] Define Claude analysis response schema for future analysis integration

## Acceptance
1. Independent tile load/refresh/status works.
2. Failed tile does not block other tiles.
3. Manual refresh updates shared `{SYMBOL}` cache.
4. `Live TV` / `Fixed Data` / `Snapshot` mode works per tile.
5. No regression in symbol/timeframe workflows.
6. Cache key is `{SYMBOL}` — single master per symbol.
