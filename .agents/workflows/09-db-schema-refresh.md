# Skill: Updating & Refreshing DB Schema (Node.js + Webhook)

**Goal:** Ensure predictable, safe schema modifications across Postgres/SQLite inside the webhook ecosystem while maintaining zero-downtime deployment for the EA/VPS.

## 1. Documentation First
Whenever you need to add a new table or append a new column to an existing table:
1. First, manually update the JSONB metadata and schema mappings in `webhook/README.md` (Postgres Schema section) to precisely reflect your proposed changes. 
2. Update `.agents/architecture.md` if the change fundamentally alters high-level data models (e.g., adding an entirely new root table like `accounts`).

## 2. Code Injection (server.js)
1. **SQLite (`db.exec`)**: 
   - Add new `CREATE TABLE` statements.
   - For adding columns to *existing* tables, append `ALTER TABLE` operations wrapped in a `try/catch` at the bottom of the SQLite init block. SQLite doesn't natively support easy `ADD COLUMN IF NOT EXISTS`.
2. **PostgreSQL (`pool.query`)**:
   - Add new `CREATE TABLE IF NOT EXISTS` blocks.
   - Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` natively to cleanly append new fields without breaking existing production rows.

## 3. Version Bump
Inside `webhook/package.json`, bump the numeric `"version"` key.
Inside `webhook/server.js`, increment `SERVER_VERSION = envStr(...)` (e.g., to `YYYY.MM.DD-NN`).

## 4. Deploy and Verify
1. Always commit first (`git commit -am "chore(db): Expand Schema"`).
2. Deploy the changes to the VPS using the script:
   `VPS_APP_DIR=/opt/trading bash scripts/deploy_webhook.sh`
3. Execute a status/curl test using the webhook `/health` endpoints to ensure PM2 restarted the updated DB instance gracefully without a crashing loop.
