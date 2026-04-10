---
description: Keep .agents docs always aligned with latest code/refactor behavior
---

Apply this workflow whenever new knowledge/rules emerge or refactor changes behavior.

1. Identify outdated lines in `.agents/rules` and `.agents/workflows`.
2. Update docs in the same task as code changes (do not defer).
3. Remove stale instructions that conflict with current architecture.
4. Add only durable rules; avoid temporary one-off notes.
5. Keep wording concise so future tasks can parse quickly.
6. If maintaining conversation memory logs, store only major milestones (not every minor turn).
7. Always keep these artifacts current after material updates:
   - rules
   - docs/decisions
   - roadmap/MASTER_PLAN.md
   - roadmap/ACTIVE_SPRINT.md
8. If a new durable behavior rule is agreed in chat, add it in `.agents` in the same turn.
