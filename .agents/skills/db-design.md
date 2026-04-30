# DB Design Playbook

Use after reading `rules/db.md`.

- Design Postgres first.
- Keep `id` internal and `sid` public.
- Keep legacy IDs until all clients move.
- Make migrations idempotent.
- Backfill with guards.
- Update `.agents/architecture/db-schema.md`.
