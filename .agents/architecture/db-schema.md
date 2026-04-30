# DB Schema

Runtime source:
- `webhook/server.js`

Identity:
- `id`: internal numeric key.
- `sid`: public UI/API key.
- legacy keys stay during migration.

Core tables:
- `users`
- `user_accounts`
- `signals`
- `trades`
- `sources`
- `execution_profiles`
- `logs`
- `market_data`
- `user_templates`

Rules:
- Postgres is production.
- Migrations must be idempotent.
- Update this file when tables or identity policy change.
- Do not point `.agents` schema docs to `docs/`.
