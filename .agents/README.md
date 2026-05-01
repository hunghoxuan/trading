# Agents Master Index

Read this first.

## Boot Order
1. `AI.md`
2. `.agents/README.md`
3. `.agents/rules.md`
4. `.agents/STATE.md`
5. `.agents/architecture/README.md`
6. `.agents/tickets/3-active/`
7. `.agents/sync/MAILBOX.md`

## Source Of Truth
- Rules: `.agents/rules.md` + `.agents/rules/`
- Architecture: `.agents/architecture/`
- Active work: `.agents/tickets/3-active/`
- Backlog/Bugs: `.agents/tickets/2-backlog/`
- Handoff: `.agents/tickets/3-active/` (active ticket) and `.agents/sync/MAILBOX.md`
- Durable lessons: `.agents/wiki/`

## Folder Map & AI Triggers
- `rules/`: **READ ON BOOT.** Mandatory boundaries and constraints. You must obey these at all times.
- `skills/`: **READ ON DEMAND.** Step-by-step playbooks and modes. Only read these when you are asked to perform a specific task or enter a mode.
- `templates/`: **READ TO FORMAT.** Boilerplate data structures. Read these only when you need to create a new ticket, bug report, or handoff file.
- `raw/`: **HUMAN ONLY.** Append-only raw memory or human prompt templates. AIs should ignore this folder.
- `tickets/`: **THE WORKFLOW.** Separated into `1-ideas/`, `2-backlog/`, `3-active/`, and `4-done/`.
- `architecture/`: Current technical design.
- `sync/`: Mailbox for agent-to-agent handoff.
- `wiki/`: Distilled durable project lessons.

## Conflict Rule
If files disagree:
1. `AI.md`
2. `.agents/rules.md`
3. `.agents/rules/*`
4. `.agents/architecture/*`
5. newest tracker/worklog entry
