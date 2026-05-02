# Ticket: Componentized Async Chart Tiles for Chart Snapshots

## Meta
- ID: `FEAT-20260502-ASYNC-CHART-TILES`
- Status: `BACKLOG`
- Priority: `P1`
- Requested by: `User`
- Implementer: `Deepseek`
- Reviewer/Release: `Codex`
- Profile: `Fullstack Developer` + `Tester`

## Outcome
Implement per-chart independent load pipeline in Chart Snapshots page so each chart tile (`symbol + timeframe`) manages its own data status and refresh lifecycle.

## Why
- Improve reliability: one failed timeframe/symbol call must not fail all charts.
- Improve UX: per-tile status and manual control.
- Improve scalability: controlled concurrency + dedupe instead of burst global calls.

## Scope
- In scope:
  - `ChartTile` component implementation.
  - Shared fetch manager/hook for dedupe + concurrency + cooldown.
  - Tile-level status (`IDLE/LOADING/READY/STALE/ERROR`).
  - Tile mode switch (`Live TV` / `Fixed Data`).
  - Manual refresh action per tile with cache save behavior.
  - Integrate tiles into Chart Snapshots grid.
- Out of scope:
  - DB schema changes.
  - AI response schema changes.
  - Massive unrelated refactor.

## Files Ownership (Deepseek)
- Primary:
  - `/Users/macmini/Trade/Bot/trading/web-ui/src/pages/ai/ChartSnapshotsPage.jsx`
- New files allowed:
  - `/Users/macmini/Trade/Bot/trading/web-ui/src/components/charts/ChartTile.jsx`
  - `/Users/macmini/Trade/Bot/trading/web-ui/src/hooks/useChartTileData.js`
  - `/Users/macmini/Trade/Bot/trading/web-ui/src/services/chartFetchManager.js`
- Optional style touch:
  - existing CSS module/global stylesheet already used by chart snapshots page

## Functional Specification

### 1) ChartTile Component
- Props:
  - `symbol: string`
  - `timeframe: string`
  - `provider: string`
  - `defaultMode: "live" | "fixed"`
  - `onSelect?(payload)`
- Internal state:
  - `mode`
  - `status`
  - `data`
  - `error`
  - `lastUpdatedAt`
- UI controls:
  - mode toggle: `Live TV` / `Fixed Data`
  - refresh button/icon
  - status badge

### 2) Independent Data Lifecycle
- On mount:
  - tile loads only its own data.
- On symbol/timeframe/mode change:
  - tile re-fetches via shared manager.
- On refresh click:
  - bypass stale cache rules, force refresh, persist cache.

### 3) Shared Fetch Manager
- Requirements:
  - dedupe in-flight calls by key `{provider}:{symbol}:{tf}:{mode}`
  - max concurrency (start with 4)
  - cooldown for manual refresh same key (example: 2-3 seconds)
  - stale-while-revalidate
- Must return deterministic structure:
  - `{ status, data, fromCache, stale, updatedAt, error }`

### 4) Status Rules
- `IDLE`: not requested yet.
- `LOADING`: fetch in progress.
- `READY`: fresh data available.
- `STALE`: cache shown while revalidating or cache too old.
- `ERROR`: fetch failed; keep previous good data if exists.

### 5) Mode Rules
- `Live TV`:
  - iframe/live view path.
  - no forced cache write unless explicitly supported by current flow.
- `Fixed Data`:
  - bars/context snapshot path.
  - cache write on successful fetch and on manual refresh.

### 6) Integration on Page
- Parent grid renders `ChartTile` list for current symbol universe/timeframes.
- Parent no longer blocks on single global fetch completion.
- Preserve existing symbols panel/filter behavior.

## Non-Functional Requirements
- Keep render smooth with many tiles.
- Avoid request storms at mount (respect manager concurrency).
- Keep existing auth/session flow untouched.

## Compatibility Constraints
- Preserve existing API contracts in `web-ui/src/api.js`.
- Do not modify backend unless strictly required; if required, isolate minimal additive change and document.

## Test Plan (Deepseek must run)
1. Build:
   - `rtk npm --prefix web-ui run build`
2. Manual behavior checks:
   - open chart page, multiple tiles load independently.
   - simulate one symbol failure -> other tiles continue.
   - refresh one tile -> only that tile transitions `LOADING -> READY/ERROR`.
   - switch mode per tile -> tile re-renders proper source.
   - mobile width check: controls remain usable.

## Acceptance Criteria
1. Each tile has isolated status and fetch lifecycle.
2. Failure in one tile does not block siblings.
3. Per-tile refresh works and updates cache for fixed mode.
4. Mode toggle works per tile.
5. No regressions in existing symbol selection and chart snapshots core flow.
6. Build passes.

## Risks
- Over-fetching when many tiles mount.
- UI complexity in large grid.

## Mitigation
- Enforce fetch manager queue + dedupe.
- Keep tile component focused and memoized where needed.

## Deepseek Return Format (mandatory)
1. Changed files list
2. What changed per file
3. Checks run + outputs
4. Known limitations / follow-up suggestions

## Reviewer Gate (Codex)
1. Validate no stale-state race in tile fetch transitions.
2. Validate manager dedupe/concurrency actually active.
3. Validate no regression to auth/session/API key flow.
4. Validate mobile usability and dense layout.
5. Validate build and deploy smoke.
