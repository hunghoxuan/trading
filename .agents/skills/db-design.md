# DB Design Skill

- Prefer Postgres-first schema and migrations.
- Keep public identifier separate from internal key:
  - internal: `id BIGSERIAL`
  - public: `sid TEXT UNIQUE NOT NULL`
- Maintain compatibility fields until all clients are switched.
- Make migrations idempotent (`IF NOT EXISTS`, guarded updates).
- Backfill only when table has data.
