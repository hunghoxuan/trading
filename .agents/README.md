# Agents Master Index

Read this first.

## Boot Order
1. `AI.md`
2. `.agents/README.md`
3. `.agents/rules.md`
4. `.agents/architecture/README.md`
5. `.agents/plans/README.md`
6. `.agents/sync/MAILBOX.md`
7. `.agents/worklog.md`

## Source Of Truth
- Rules: `.agents/rules.md` + `.agents/rules/`
- Architecture: `.agents/architecture/`
- Active work: `.agents/plans/sprint.md`
- Bugs: `.agents/plans/bugs.md`
- Handoff: `.agents/worklog.md` and `.agents/sync/MAILBOX.md`
- Durable lessons: `.agents/knowledge/`

## Folder Map
- `rules/`: mandatory behavior.
- `architecture/`: current technical design.
- `plans/`: sprint, bugs, backlog, changelog.
- `sync/`: mailbox for agent-to-agent handoff.
- `knowledge/`: durable project lessons.
- `skills/`: optional playbooks, not law.
- `templates/`: copy/paste task templates.

## Conflict Rule
If files disagree:
1. `AI.md`
2. `.agents/rules.md`
3. `.agents/rules/*`
4. `.agents/architecture/*`
5. newest tracker/worklog entry
