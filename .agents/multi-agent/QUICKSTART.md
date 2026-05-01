# Quickstart (Low-Coupling)

## Step 1: Choose Execution Mode

1. Single-Agent: tiny ticket, one owner.
2. Feature-Pod: one agent owns one feature end-to-end.
3. Parallel-Feature: many independent features in parallel.
4. Pick profile combo from `/.agents/multi-agent/profile-selection-matrix.md`.

## Step 2: Create Ticket

Create: `/.agents/tickets/3-active/YYYY-MM-DD-<slug>.md`

Include:
- outcome
- scope
- acceptance checks
- dependency gates (if any)

## Step 3: Assign Agent

Copy `/.agents/templates/agent-task-card.md` and fill:
- task
- profile (single or combined, e.g. `Fullstack+Tester`)
- owned files
- forbidden scope
- checks
- output format

## Step 4: Handoff

When done or blocked, post `/.agents/templates/agent-handoff.md` to:
- `/.agents/sync/MAILBOX.md`

## Step 5: Integrate

Use `/.agents/templates/integration-gate.md`:
- confirm all gates green
- run final checks
- deploy only after all required checks pass

## Step 6: Close

Update:
- ticket status
- `.agents/worklog.md` finish entry
