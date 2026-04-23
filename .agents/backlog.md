# Backlog

## Completed
- [x] [2026-04-16 11:30] [Reliability] [Author: Hung] Task: Implement "Deadlock Breaker" (Stale Lock Recovery) in Postgres backend for signals locked > 5 mins.
- [x] [2026-04-16 12:45] [Reliability] [Author: Hung] Task: Update EA status mapping (START/SUBMITTED) and increase timezone drift tolerance to 2 hours.

## High Priority (`P0` / `P1`)
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
