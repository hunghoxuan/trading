# Ticket: Chart Sync Cards (Componentized Async Tiles)

## Meta
- ID: `FEAT-20260502-ASYNC-CHART-TILES`
- Status: `IN PROGRESS` (was BACKLOG)
- Priority: `P1`
- Requested by: `User`
- Implementer: `Deepseek`
- Reviewer/Release: `Codex`
- Profile: `Fullstack Developer` + `Tester`

## Decision Lock (Confirmed During Implementation)
1. Persisted cache namespace is symbol-centered: `MARKET_DATA:SYMBOL`
   - Frontend cache key: `{SYMBOL}` only — single master object per symbol
   - Master object: `{ symbol, cached_at, bars: { [tf]: [...] }, context: { [tf]: {...} }, snapshots: { [tf]: { file_id, file_name, uploaded_at } } }`
2. Provider removed from cache key entirely (data is same regardless of broker).
3. Existing symbol-select process and card-refresh process run through same `api.chartRefresh`.
4. One refresh button per card; mode-aware behavior.
5. Refresh fetches ALL TFs, ALL types in single API call.
6. Parallel pipelines: bars + snapshots in same `api.chartRefresh` call + Claude upload in Snapshot mode.
7. Modes share same cache — mode controls display only.
8. Component renamed: `ChartTile` → `SymbolChart`.
9. Snapshot storage: `market_data.metadata` JSONB column (Solution 2 — no schema change).
10. `allTfs` prop with default `["D", "4h", "15m", "5m"]`.

## Current Process Name / API (Canonical)
- Process backbone:
  - Frontend API: `api.chartRefresh(...)` → `POST /v2/chart/refresh`
  - Claude upload: `api.claudeUploadSnapshots(...)`
- Pipeline (single Refresh click):
  1. `api.chartRefresh({ symbols, timeframes: allTfs, types: ["context","bars","snapshots"] })` — ONE call
  2. If Snapshot mode: `api.claudeUploadSnapshots({ files })` — separate
  3. Merge into `chartFetchManager` master cache keyed by `{SYMBOL}`

## Standardized Product Name
- User-facing process name: `Chart Sync`
- Internal mapping: `Chart Sync` => `api.chartRefresh` pipeline + optional Claude upload

## Outcome
Implement per-card chart components (`SymbolChart`) so each symbol+timeframe card has isolated status and actions, while sharing a centralized master cache (`{SYMBOL}` key) aligned with backend `MARKET_DATA:SYMBOL`.

## Scope
- In scope:
  - New chart card component (`SymbolChart`, in `ChartTile.jsx`).
  - Per-card status lifecycle.
  - Per-card refresh button running `Chart Sync`.
  - Shared fetch manager (`chartFetchManager.js`) with single `{SYMBOL}` cache key.
  - Master object per symbol: all TFs, bars, context, snapshots.
  - Parallel pipelines (bars + snapshots in one API call).
  - Per-card hook (`useSymbolChartData`, in `useChartTileData.js`).
  - `allTfs` prop for flexibility (default `["D","4h","15m","5m"]`).
  - Snapshot metadata stored via `market_data.metadata` JSONB (no schema change).
  - Integrate cards into Chart Snapshots page browser grid.
- Out of scope:
  - DB schema migration.
  - Rewriting AI response schema.
  - Unrelated refactors.
  - Claude analysis (schema TBD — snapshots uploaded but not analyzed yet).

## Files Ownership (Deepseek)
- Primary:
  - `web-ui/src/pages/ai/ChartSnapshotsPage.jsx` — updated imports, `<SymbolChart>` in browser grid
- New files:
  - `web-ui/src/components/charts/ChartTile.jsx` — exports `SymbolChart`
  - `web-ui/src/hooks/useChartTileData.js` — exports `useSymbolChartData`
  - `web-ui/src/services/chartFetchManager.js` — shared fetch manager

## Functional Specification

### 1) SymbolChart Component Contract (was ChartTile)
- Props:
  - `symbol` (required)
  - `timeframe` (required)
  - `allTfs` (optional; default `["D","4h","15m","5m"]`)
  - `bars` (optional; from outside or auto-fetched)
  - `snapshot_file_id` (optional; Claude file_id)
  - `snapshot_file_name` (optional; VPS file name)
  - `cached_time` (optional; last cache timestamp)
  - `defaultMode` (optional; default `"Fixed Data"`)
- Modes:
  - `Live TV` — iframe only
  - `Fixed Data` — TradeSignalChart with bars
  - `Snapshot` — TradeSignalChart + snapshot pipeline
- Status:
  - `IDLE`, `LOADING`, `READY`, `STALE`, `ERROR`
  - Color-coded badge
- Controls:
  - Mode toggle dropdown
  - Single `Refresh` button

### 2) One Refresh Button (Mode-Aware, Same Chart Sync Family)
- `Refresh` in `Live TV`:
  - reload/rebind iframe only via `liveKey` counter
- `Refresh` in `Fixed Data`:
  1. Check cache: `chartFetchManager.getTf(symbol, tf)` — if fresh, skip
  2. Call `api.chartRefresh({ symbols, timeframes: allTfs, types: ["context","bars","snapshots"] })`
  3. Merge into master cache (RMW)
  4. Update card status
- `Refresh` in `Snapshot`:
  1. Same as Fixed Data (steps 1-3)
  2. Add: `api.claudeUploadSnapshots({ files })` — upload to Claude
  3. Store `file_id`/`file_name` in master cache snapshots map

### 3) Symbol Select and Card Refresh — Same Cache
- Card refresh populates `chartFetchManager` with master object
- Future: symbol-select warmup checks `chartFetchManager.isFresh()` before API call (follow-up)
- Both use same `api.chartRefresh` pipeline

### 4) Cache Contract (Locked — Updated)
- Cache key: `{SYMBOL}` only (e.g. `EURUSD`) — no provider, no mode, no TF
- Master object shape:
  ```
  { symbol, cached_at, source,
    bars:       { "4h": [...], "d": [...] },
    context:    { "4h": { last_price, summary, freshness } },
    snapshots:  { "4h": { file_id, file_name, uploaded_at } }
  }
  ```
- In-flight dedupe key: `{symbol}:{tf}` (runtime only)

### 5) Shared Fetch Manager — `chartFetchManager`
- Cache key: `{SYMBOL}` — single master per symbol
- `get(symbol)` → master object or null
- `getTf(symbol, tf)` → `{ bars, snapshot, cached_at, stale }` for one TF
- `isFresh(symbol, maxAgeMs)` → boolean
- In-flight dedupe by `{symbol}:{tf}`
- Concurrency cap: 4
- Cooldown: 2.5 s
- Stale-while-revalidate

### 6) Status Transition Rules
- `IDLE` → initial state
- `LOADING` → card syncing
- `READY` → fresh data
- `STALE` → showing cached data while refresh in background
- `ERROR` → sync failed

### 7) UI/UX Rules
- Keep existing symbol panel behavior intact.
- Dense trading layout.
- Refresh button shows spinner while loading.
- Error text local to card.

## Test Plan (Deepseek must run)
1. Build: `npm --prefix web-ui run build`
2. Manual:
   - Symbol list cards render with status badges
   - Refresh card in each mode (Live TV, Fixed Data, Snapshot)
   - Select symbol → warmup runs
   - Cache key is `{SYMBOL}` (no provider)
   - Stale cache shows STALE + background refresh

## Acceptance Criteria
1. [x] Per-card refresh exists and works.
2. [x] Symbol-select and card-refresh use same `Chart Sync` family.
3. [x] Cache key is `{SYMBOL}` (no provider, matches `MARKET_DATA:SYMBOL`).
4. [x] `Snapshot` mode: bars + snapshots + Claude upload (no analysis).
5. [x] Isolated status per card.
6. [x] Build passes.
7. [x] Page warmup reads from `chartFetchManager` (done — skips context API if cache fresh).
8. [x] Backend stores `file_id` in `market_data.metadata` (done — `repoUpsertUnifiedMarketData` snapshot field).

## Risks
- Credit usage in `Snapshot` mode.
- Queue pressure when many cards refresh quickly.

## Mitigation
- Cooldown (2.5 s) + bounded concurrency (4).
- Explicit mode gating for Claude upload.

## Known Limitations / Follow-up
1. Page warmup doesn't yet read from `chartFetchManager` — still calls API independently.
2. Claude upload response `file_id` not yet propagated to `market_data.metadata` on backend.
3. Snapshot validity check uses timestamps only (no file existence check from Claude).

## Reviewer Gate (Codex)
1. Validate `{SYMBOL}` cache key in all touched frontend code.
2. Validate same `Chart Sync` family for symbol-select + refresh.
3. Validate no stale-state race in RMW merge.
4. Validate mode-aware refresh: Live TV (iframe), Fixed (bars), Snapshot (bars + upload).
5. Validate build and deploy smoke.
