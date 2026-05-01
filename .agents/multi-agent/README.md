# Multi-Agent Kit

Purpose: run multiple agents with low coupling, fast handoff, clear ownership.

## Profile Flexibility

1. Agent identity is not fixed to a permanent role.
2. One agent can perform multiple profiles when scope is small.
3. For larger work, assign one primary profile per ticket owner.
4. Reassign profile by ticket need, not by agent name.

## Core Rules

1. One ticket, one owner.
2. Declare file ownership before coding.
3. Do not edit outside owned files.
4. Use explicit dependency gates when blocked.
5. Share only required handoff data.

## Folder Structure

- `/.agents/multi-agent/`: playbooks and profiles
  - `PROFILES.md`
  - `profile-selection-matrix.md`
- `/.agents/templates/`: copy-paste templates
- `/.agents/sync/MAILBOX.md`: agent-to-agent handoff log
- `/.agents/tickets/3-active/`: live ticket tracking
- `/.agents/worklog.md`: start/finish execution records

## Default Flow

1. Create ticket in `tickets/3-active`.
2. Pick mode: single-agent, feature-pod, or parallel-feature.
3. Assign each agent with `agent-task-card.md` and chosen profile(s).
4. Execute in parallel.
5. Post handoff to `MAILBOX.md` with `agent-handoff.md`.
6. Run integration checklist with `integration-gate.md`.
7. Close ticket and log completion in worklog.
