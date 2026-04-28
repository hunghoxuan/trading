# Backlog

## Completed
- [x] [2026-04-16 11:30] [Reliability] [Author: Hung] Task: Implement "Deadlock Breaker" (Stale Lock Recovery) in Postgres backend for signals locked > 5 mins.
- [x] [2026-04-16 12:45] [Reliability] [Author: Hung] Task: Update EA status mapping (START/SUBMITTED) and increase timezone drift tolerance to 2 hours.
- [x] [2026-04-27 15:30] [Web-UI/Architecture] [Author: Antigravity] Task: Restore Signal Detail header density, fix Master-Detail data sync bugs, and implement mandatory Session Worklog protocol.

## High Priority (`P0` / `P1`)
- [ ] [2026-04-28 13:35] [Web-UI/Settings] [Author: User] Feature: Improve Settings page. Convert current one-page settings detail into a left-column tab/menu layout, where each tab/menu item is one standalone setting and the selected setting loads in the right detail panel. Start candidate item `0`.
- [ ] [2026-04-28 13:35] [Web-UI/AI] [Author: User] Feature: Update AI page empty-state chart browser. When no symbol is selected, show TradingView live charts for all symbols with infinite scrolling or pagination. Allow switching timeframe globally; render one chart per symbol per selected timeframe. Start candidate item `1`.
- [ ] [2026-04-28 13:35] [Market-Data/Cron/DB/Cache] [Author: User] Feature: Add cron jobs to fetch bar data and update DB/cache. Fetch provider data asynchronously/parallel, batching symbols if provider limits prevent all-at-once requests. Run per timeframe cadence (1m every 1 min, 5m every 5 min, etc.). Merge bars into DB without duplicates, overlap, or gaps. Requires careful plan for uniqueness, gap detection/backfill, provider limits, and cache invalidation. Include settings toggle plus selectable timeframes and symbols.
- [ ] [2026-04-28 13:35] [AI-Automation/Cron/Signals/Trades] [Author: User] Feature: Add cron jobs to call AI analysis and auto-create Signal or Trade rows. Include settings toggle plus selectable timeframes, symbols, entry models, profile, direction, order type, and similar controls to the current AI page settings modal.
- [x] [2026-04-16 13:10] [Reliability] [Author: Hung] Feature: **Full State Reconciliation System**. Implement `/mt5/ea/sync` (active list) and `/mt5/ea/bulk-sync` to ensure VPS and MT5 always maintain identical trade states. (`P0`)
- [ ] [2026-04-15 12:25] [Infra/Deployment] [Author: User] Feature: Add SSL/TLS and enforce HTTPS for production server (domain + webhook + UI + API compatibility).
- [ ] [2026-04-15 16:30] [webhook-ui/dashboard + webhook/server.js] [Author: Codex] Task: Complete dashboard phase-2 gap by wiring account-level balance/equity/free-margin card from `accounts` heartbeat snapshots and add smoke tests for `/mt5/dashboard/advanced`.
- [ ] [2026-04-14 15:00] [Architecture] [Author: User] Feature: Implement `EntryModel` schema-driven dynamic trade config/checker to replace if/else logic (`P0`).
- [ ] [2026-04-14 15:00] [SMC / MSS / Core] [Author: User] Feature: Apply Wave-1 gate cuts in SMC, then MSS, then Core (`P0`).
- [ ] [2026-04-16 22:43] [Security/TV-EA-Server-DB] [Author: User] Feature: Replace payload `api_key` transmission with industrial-grade authentication, key management, and signed request validation across TV, EA client, server, and database.
- [ ] [2026-04-17 15:35] [Architecture/DB/API/Web-UI] [Author: User] Feature: Redesign execution model with `signals` as immutable reference feed, new `trades` as account-bound execution ledger, account-level API key ownership, source subscriptions per account, and broker pull filtered by account source registration.
- [ ] [2026-04-21 10:30] [Web-UI/AI + webhook/server.js + DB] [Author: User] Feature: Add SYSTEM-only AI provider registry config (`type='SYSTEM'`) to manage provider metadata (name, models, API URL, api_key_setting_name, authorization header strategy) without code deploy.
- [x] [2026-04-20 13:35] [Scripts/AI] [Author: Gemini] Feature: Implement Multi-Model AI CLI Gateway. -> MOVED TO SPRINT.
- [ ] [2026-04-20 13:58] [Web-UI/AI] [Author: User] Feature: AI Agent Hub Page. -> MOVED TO SPRINT.

## Low Priority (`P2`)
- [ ] [2026-04-14 15:00] [Architecture] [Author: User] Feature: Define HTF1-priority trend/bias direction policy.
- [ ] [2026-04-14 15:00] [Indicators] [Author: User] Feature: Add trade minimum size/length filters.
- [ ] [2026-04-23 20:35] [Web-UI/Architecture] [Author: User] Feature: After current phase, migrate gradually to Tailwind + shadcn for shared UI components (`Button`, `Input`, `Select`, `Card`, `Tabs`) to standardize design system and speed up UI iteration.
- [ ] [2026-04-23 22:40] [Web-UI/Forms/UX] [Author: User] Feature: Enforce form UX rules in implementation phase: same-meaning controls in same row, consistent alignment, button loading state (disable + spinner), inline form-level feedback below controls only, and Save/Add buttons enabled only when form is dirty.
