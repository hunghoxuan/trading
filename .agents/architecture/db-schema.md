# DB Schema

Source files:
- `docs/mt5-product/SCHEMA.sql`
- `webhook/server.js`

Identity:
- `id`: internal numeric key.
- `sid`: public UI/API key.
- legacy keys stay during migration.

Rules:
- Postgres is production.
- Migrations must be idempotent.
- Update this file when tables or identity policy change.
