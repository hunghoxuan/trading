# SOP: Update Documentation

Goal: keep docs aligned with implementation changes.

## Trigger

- Any schema/API/status/version behavior change.

## Steps

1. Identify impacted docs (examples):
- `webhook/README.md`
- `docs/mt5-product/SCHEMA.sql`
- `docs/mt5-product/DESIGN.md`
- `.agents/architecture.md`
2. Update docs in same task before marking done.
3. Ensure examples/commands are runnable and current.
4. Add changelog entry for doc-sync completion.

## Completion Rule

- A feature is not complete if docs are stale for changed behavior.
