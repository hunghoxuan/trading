# Ticket: Chart Sync Cards (Componentized Async Tiles)

## Meta
- ID: `FEAT-20260502-ASYNC-CHART-TILES`
- Status: `BACKLOG` (re-promoted from idea)
- Priority: `P1`
- Requested by: `User`
- Implementer: `Deepseek`
- Reviewer/Release: `Codex`
- Profile: `Fullstack Developer` + `Tester`

## Decision Lock (Important)
This ticket is now implementation-ready with locked contracts:
1. Persisted cache namespace must be symbol-centered:
   - `MARKET_DATA:SYMBOL`
2. Existing symbol-select process and card-refresh process must run the same pipeline.
3. One refresh button per card; mode-aware behavior is mandatory.

## Current Process Name / API (Canonical)
- Existing process backbone:
  - Frontend API: `api.chartRefresh(...)`
  - Backend endpoint: `POST /v2/chart/refresh`
- Existing warm-up stages in page flow:
  - context warm-up
  - snapshot warm-up
  - optional analyze using snapshot files/context

## Standardized Product Name
- User-facing process name: `Chart Sync`
- Internal mapping:
  - `Chart Sync` => `api.chartRefresh` pipeline + optional analyze step

Use this same name for:
1. Symbol select auto-process
2. Per-card refresh button process

## Outcome
Implement per-card chart components so each card (`symbol + timeframe`) has isolated status and actions, while preserving centralized persisted cache model (`MARKET_DATA:SYMBOL`).

## Scope
- In scope:
  - New chart card component (`ChartTile`).
  - Per-card status lifecycle.
  - Per-card refresh button running `Chart Sync`.
  - Keep persisted cache contract as `MARKET_DATA:SYMBOL`.
  - Update any plain `{SYMBOL}`/legacy references in page/service code paths touched by this feature to `MARKET_DATA:SYMBOL`.
  - Integrate cards into Chart Snapshots page grid.
- Out of scope:
  - DB schema migration.
  - Rewriting AI response schema.
  - Unrelated refactors.

## Files Ownership (Deepseek)
- Primary:
  - `/Users/macmini/Trade/Bot/trading/web-ui/src/pages/ai/ChartSnapshotsPage.jsx`
- New files allowed:
  - `/Users/macmini/Trade/Bot/trading/web-ui/src/components/charts/ChartTile.jsx`
  - `/Users/macmini/Trade/Bot/trading/web-ui/src/hooks/useChartTileData.js`
  - `/Users/macmini/Trade/Bot/trading/web-ui/src/services/chartFetchManager.js`
- Optional touch (if needed):
  - `/Users/macmini/Trade/Bot/trading/web-ui/src/api.js`
  - styles already used by snapshots page

## Functional Specification

### 1) ChartTile Component Contract
- Props:
  - `symbol` (required)
  - `timeframe` (required)
  - `bars` (optional; if not provided, resolve from cache/fetch flow)
  - `entries` (optional)
  - `provider` (optional; default existing provider flow)
  - `defaultMode` (optional; default `"fixed"`)
- Modes:
  - `Live TV`
  - `Fixed Data`
  - `Snapshot`
- Status:
  - `IDLE`, `LOADING`, `READY`, `STALE`, `ERROR`
  - Must include visible color-coded badge.
- Controls:
  - Mode toggle
  - Single `Refresh` button

### 2) One Refresh Button (Mode-Aware, Same Chart Sync Family)
- `Refresh` in `Live TV`:
  - reload/rebind iframe card view only.
  - no snapshot/analyze side-effects.
- `Refresh` in `Fixed Data`:
  1. run `Chart Sync` bars/context branch via `chartRefresh`
  2. use cached `MARKET_DATA:SYMBOL` if fresh
  3. if stale/missing TF: fetch from Twelve and update same symbol cache object
  4. update card status
- `Refresh` in `Snapshot`:
  1. run same `Chart Sync` bars/context branch
  2. ensure snapshots for relevant TFs
  3. upload/use Claude files context for snapshots
  4. trigger analyze/send to Claude for those TFs
  5. update status through full lifecycle

### 3) Symbol Select Must Match Refresh Family
- On symbol select, invoke same `Chart Sync` family process semantics as card refresh (auto-run branch by current mode/default mode).
- Status transitions should be comparable between symbol-select and manual refresh.

### 4) Cache Contract (Locked)
- Persisted market cache key must be `MARKET_DATA:SYMBOL`.
- All timeframe bars for same symbol remain grouped in same symbol cache object.
- Do not split persisted cache into per-TF keys in this ticket.
- Runtime in-flight dedupe key may remain granular:
  - `{provider}:{symbol}:{timeframe}:{mode}`
  - This is request-coordination key, not persisted cache key.

### 5) Shared Fetch Manager / Hook
- Requirements:
  - in-flight dedupe (runtime key above)
  - bounded concurrency (start at `4`)
  - manual refresh cooldown per runtime key (2-3s)
  - stale-while-revalidate behavior
- Return contract:
  - `{ status, data, fromCache, stale, updatedAt, error }`

### 6) Status Transition Rules
- `IDLE` -> initial no work state
- `LOADING` -> card currently syncing
- `READY` -> fresh usable output for current mode
- `STALE` -> showing cached data while refresh in progress or aged cache
- `ERROR` -> sync failed; preserve previous good data if available

### 7) UI/UX Rules
- Keep existing symbol panel behavior intact.
- Keep dense trading layout, mobile usable controls.
- Refresh button should show busy state while sync running.
- Error text should be concise and local to card.

## Non-Functional Requirements
- Avoid mass fan-out storms on mount.
- No auth/session regressions.
- Keep logic deterministic and debuggable.

## Test Plan (Deepseek must run)
1. Build:
   - `rtk npm --prefix web-ui run build`
2. Manual checks:
   - select symbol -> card statuses update via `Chart Sync`
   - refresh one card in each mode (`Live TV`, `Fixed Data`, `Snapshot`)
   - one failing card does not block others
   - symbol cache path stays `MARKET_DATA:SYMBOL` semantics
   - mobile width usability

## Acceptance Criteria
1. Per-card refresh exists and works.
2. Symbol-select and card-refresh use same `Chart Sync` family process.
3. Persisted cache stays `MARKET_DATA:SYMBOL`.
4. `Snapshot` mode refresh performs full pipeline (bars/context -> snapshots -> Claude analyze).
5. Isolated status per card.
6. Build passes.

## Risks
- Credit usage in `Snapshot` mode.
- Queue pressure when many cards refresh quickly.

## Mitigation
- Cooldown + bounded concurrency.
- Explicit mode gating for expensive flow.

## Deepseek Return Format (mandatory)
1. Changed files list
2. What changed per file
3. Checks run + outputs
4. Known limitations / follow-up suggestions

## Reviewer Gate (Codex)
1. Validate `MARKET_DATA:SYMBOL` contract preserved in touched code.
2. Validate same `Chart Sync` family semantics for symbol-select + refresh.
3. Validate no stale-state race.
4. Validate mode-aware refresh behavior exactly as ticket.
5. Validate build and deploy smoke.
