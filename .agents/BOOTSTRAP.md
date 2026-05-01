# Unified AI Bootstrap (Single Source)

All AI agents in this repo must load project context in this exact order before planning, coding, or architecture advice:

1. `AI.md`
2. `.agents/README.md`
3. `.agents/rules.md`
4. `.agents/rules/*` in listed order
5. `.agents/STATE.md`
6. `.agents/.product/architecture/README.md`
7. `.agents/.product/tickets/feature_tracker.md`
8. `.agents/sync/MAILBOX.md`
9. `.agents/worklog.md`

## Execution Rules

- Treat `.agents/` as source of truth for active context and process.
- If conflicts exist, resolve using `.agents/README.md` conflict rule.
- Do not assume old chat memory is valid; re-read `.agents/` context per new conversation.
- Follow RTK command policy when running shell commands.
- Organization:
  - product: `.agents/.product/` (Architecture, Features, Tickets, Wiki)
  - raw: `.agents/.raw/` (Append-only / Not for AI logic)
  - rules: `.agents/rules/` (Mandatory behavior)
