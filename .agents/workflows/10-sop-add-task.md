# SOP: Add Task

Goal: intake a new feature request and register it correctly before planning or coding.

## Steps

1. Parse the request into one clear task statement.
2. Choose priority intent:
- `P0`: system down / data loss / production block.
- `P1`: high-impact feature or reliability improvement.
- `P2`: enhancement/polish.
3. Append to `.agents/backlog.md` using strict format:
- `- [ ] [YYYY-MM-DD HH:MM] [Module/File] [Author: User] Feature: <description>.`
4. Confirm in chat that task was queued.
5. Ask whether to prioritize into sprint now or keep in backlog.

## Output Contract

- Never skip backlog registration for a new feature.
- Do not start coding from this SOP; hand off to `11-sop-plan-feature.md`.
