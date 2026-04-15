# Active Sprint

## Sprint Goal
Improve signal/trade pipeline clarity and reduce unnecessary runtime cost.

## Currently Doing
- [ ] [2026-04-14 15:00] [Hung - Core] [Author: User] Task: Audit and reduce non-essential gate/score/limitation branches (`P0`).
- [ ] [2026-04-14 15:00] [Kit - SMC] [Author: User] Task: Apply Wave-1 safe cut list from inventory (`P0`).
- [ ] [2026-04-15 11:55] [TVBridgeEA.mq5] [Author: Gemini] [DOING] Feature: Implementation of EA Client-to-VPS Sync feature (PENDING ack and heartbeat).
  - *Plan: Modify `OnTradeTransaction` to catch Limit/Stop orders -> Ack(PENDING). Catch DELETE -> Ack(CANCEL).*
  - *Plan: Add `OnTimer(5)` -> SendHeartbeat() payload with Account Health.*
- [ ] [2026-04-15 11:55] [webhook/server.js] [Author: Gemini] [DOING] Feature: Multi-Account support and Database Schema update.
  - *Plan: Modify DB schema (SQLite + Postgres) to add `accounts` table (`account_id`, `user_id`, `name`, `balance`, `status`, `metadata`, `created_at`, `updated_at`).*
  - *Plan: Add `metadata (JSON)` column to `users`, `signals`, and `signal_events` tables.*
  - *Plan: Add `account_id` routing to all EA `/ack` and `/heartbeat` webhook payloads.*

## Up Next
(Items pulled from backlog once current tasks finish. Max sprint capacity: 3-5 active items)
