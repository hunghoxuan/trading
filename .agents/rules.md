# Rules Index

Mandatory rules live here.

Read all files in this order:

1. `rules/communication.md`
2. `rules/planning.md`
3. `rules/safety.md`
4. `rules/handoff.md`
5. `rules/db.md`
6. `rules/ui.md`
7. `rules/deploy.md`
8. `rules/testing.md`
9. `rules/cli.md`
10. `rules/scratch.md`
11. `rules/scripting.md`
12. `rules/token.md`
13. `rules/memory-governance.md`
14. `rules/documentation_integrity.md`

## Global Law
- Plan first for feature/UI/DB/architecture changes.
- Ask approval before changing behavior unless user says execute now.
- Preserve user-facing behavior unless explicitly changed.
- Update worklog at START and FINISH of significant work.
- Test real code changes.
- Bump matched server/EA versions for backend, EA, UI, or script changes.

## Workflow Laws
- **Documentation First**: Before executing any new tasks, update or create the relevant Feature document in `.product/features/` and Ticket document in `.product/tickets/`.
- **Clean Hand-off**: After finishing a task, always update the hand-off document (`MAILBOX.md`) and the relevant Feature/Ticket status with detailed progress.
