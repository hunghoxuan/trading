# DB Rules

- Production DB is Postgres.
- Verify health/storage before production DB operations.
- Current health endpoint:
  - `https://trade.mozasolution.com/webhook/mt5/health`
- Identity policy:
  - `id BIGSERIAL`: internal joins/updates/deletes
  - `sid TEXT UNIQUE NOT NULL`: human-facing UI/API ID
  - legacy IDs stay for compatibility
- UI shows/searches `sid`.
- Backend accepts `id`, `sid`, and legacy IDs.
- Migrations must be idempotent.
- Backfill only guarded data.
- Update schema docs when schema changes.

