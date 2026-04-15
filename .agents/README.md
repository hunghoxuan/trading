# AI Agent Entrypoint

Welcome. You are working on the Trading Bot project. 
To ensure system boundaries and rules are respected, you must load and read the following context files before writing code:

## 1. Governance & Rules (Required)
- `rules.md`: Hard coding constraints, architecture boundaries, and project management SOPs. **(MUST READ)**
- `architecture.md`: System map, contracts, and data flow.

## 2. Active State (Required)
- `sync/MAILBOX.md`: **CHECK THIS FIRST.** This is the inter-agent handoff. Read this to receive your immediate priorities.
- `sprint.md`: Current active tasks (Max 3-5). Look for tasks tagged with your `[TODO: AgentName]`.
- `bugs.md`: Active issues undergoing triage or fixing.

## 3. Backlog & History (Optional / As Needed)
- `backlog.md`: Active priorities not yet in the sprint.
- `changelog.md`: Append-only history of completed work.
- `knowledge/`: Root folder for domain-specific quirks. Check this if you are stuck.

## 4. Bootstrapping Instructions
Read `rules.md` now. Pay special attention to Section 5 (Multi-Agent Protocol) regarding how to use `MAILBOX.md`. Note the strict tracking format for `sprint` execution before closing any task.
