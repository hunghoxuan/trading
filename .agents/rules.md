# Project Rules — Trading Bot

## 1. Task Completion Summary (ALWAYS)

After **every** completed task or phase, end your response with exactly this format:

```
## ✅ Done
- [what was completed]

## 🔜 Remaining
- [what is left / next tasks]

## 📄 Build Versions
- [filename]: [Hardcoded Code Version (e.g., EA_VERSION "1.23", lib-version: 80)]

## 🧪 Test / Deploy
- [exact runnable commands — curl, ssh, compile, publish]
```

- **Rule:** All 4 sections always included. Keep each section short (max 5 bullets).  
- **Rule (Build Versions):** You MUST report the actual incremental version variable explicitly defined inside the code (e.g. `#define EA_VERSION "1.xx"`, `package.json version`, `@lib-version: 80`). NEVER write "updated" or "local_version". If you change logic, you MUST safely increment that hardcoded version in the file before reporting it. Test/deploy must be real commands.

## 2. Execution Discipline (Task Lifecycle)

- **Mandatory Flow for Major Tasks:**
  *(Exception rule: For quick fixes, deployment commands, bug squashing during active flow, or general Q&A, you DO NOT need to update `backlog.md`/`sprint.md`/`changelog.md`. Reserved the heavy tracking lifecycle ONLY for adding tasks, new requirements, or new feature blocks.)*
  1. **Document First:** When the user asks for a major task, FIRST update the tracking documents (`backlog`/`sprint`/`bugs`).
  2. **Plan Solution:** Write down the proposed solution/plan.
  3. **Design Approval Gate (No Code by Default):** For every new feature/requirement, provide a comprehensive design/spec first and wait for explicit user approval before writing code.
  4. **Update Status (DOING):** Move the task to `.agents/sprint.md`, prepending `[DOING]` to the description with timestamp and author.
  5. **Execute & Test:** Write the code. If it involves the VPS or DB, strictly run the deploy scripts and test it.
  6. **Update Status (COMPLETED):** Remove it from `.agents/sprint.md` and append it to `.agents/changelog.md` with a `[COMPLETED]` prefix.
- **One-Pass:** If task is small/mechanical (rename, formatting, pure refactor), execute in one-pass. Avoid unnecessary intermediate checkpoints.
- **Conversation Health:** Continuously self-check. If 2+ degradation signals appear (repeated conclusions, forgetting constraints), provide a compact handoff and propose creating a new conversation.
- **Overnight Autonomous Mode:** Run automatically during 23:00-07:00 (Europe/Berlin) without per-step confirmations for approved plans.
- **Skill Extraction (Workflows):** If you perform any repeatable, multi-step chore (e.g. updating DB schemas, deployments, deep refactors), or if the user asks, you MUST extract the execution sequence into a reusable workflow file natively saved in `.agents/workflows/XX-action-name.md`.

# Mandatory Technical Standards
1. **Production Database**: Always prioritize **Postgres** logic. The local `.env` may show SQLite, but the VPS uses a remote Postgres instance.
2. **Environment Verification**: Before making database changes, ALWAYS check the `https://signal.mozasolution.com/mt5/health` endpoint to verify the active storage engine.
3. **MQL5 Synchronization**: Use `OnTradeTransaction` for trade acknowledgements to ensure one-to-one mapping between broker tickets and signal IDs.

## 3. Pine Script Coding Standards
- **Naming:** 
  - `get_data_xxx` (gathering), `draw_data_xxx` (rendering), `process_data_xxx` (orchestration).
  - Use `local_` prefix for indicator-local helpers. 
  - Prefer clear domain names: `trade`, `pd_array`, `event`.
- **Section Order:** Every Pine file must follow this exact section order:
  1. `// ==================== global vars, state, singletons ====================`
  2. `// ==================== types, consts ====================`
  3. `// ==================== input settings ====================`
  4. `// ==================== local helpers ====================`
  5. `// ==================== main logic ====================`
  Never append at the end of the file. Place new code in the correct section.
- **Code Optimization:** Write the most concise correct code. Prefer ternary expressions over multi-line if/else. Avoid separate loops over the same array.

## 4. Architecture & State Management 

- **ChartContext Ownership:** Use `ChartContext` as the shared data container across indicators (`zones`, `levels`, `events`, `signalHist`). Keep `trades` outside `ChartContext` unless explicitly requested.
- **RuntimeContext:** Use `RuntimeContext` for chart lifecycle gates (`chartIsNew`, `symbolChanged`, `tfChanged`), not ad-hoc per-file flags.
- **Preservation:** Never delete, remove, or silently downgrade an existing user-facing feature without explicit user confirmation.

## 5. Multi-Agent Protocol & Communication

To ensure seamless coordination between multiple AI agents (Gemini, Codex, etc.) sharing this workspace, execute the following strict file-system mechanisms:

- **Agent Tags:** All tasks inside `.agents/sprint.md` MUST explicitly declare target assignees, e.g., `[TODO: Gemini]`, `[TODO: Codex]`, or `[TODO: Any]`. When you initialize your routine, **ONLY** execute tasks explicitly assigned to your name or "Any".
- **The Mailbox:** NEVER give the user a chunk of text to "copy and paste to the next AI". Instead, write your handoff context robustly into `.agents/sync/MAILBOX.md`. The user will merely instruct the next agent to "Check the mailbox".
- **Knowledge Base:** If you encounter a highly specific domain quirk (e.g., MT5 transaction bugs, React React-Router nuances), DO NOT let the next AI reinvent the wheel. Write a short snippet into `.agents/knowledge/`. You MUST read the relevant files in `.agents/knowledge/` before beginning any heavy implementations.
- **Concurrency:** Do not touch files explicitly being modified by another assigned agent task as dictated by `sprint.md`.
- **System File Protection:** NEVER delete any `.agents/*` files, `AI.md`, or `.cursorrules`. To "clear" the mailbox, you must empty its contents or write `[EMPTY]`, but NEVER execute file deletion on `MAILBOX.md`. These files are structural dependencies.

## 6. Pine Error Prevention (Critical)

- **Typed `na`:** Use explicit casts (`int(na)`, `float(na)`), never raw `na` for typed arguments.
- **Empty Branches:** Never leave `if/else` branches empty. Use explicit no-op: `bool(na)`.
- **Historical Offsets:** Any dynamic `x[offset]` must be clamped to safe limits before access.
- **Array Size & Get:** Do not combine `array.size` + `array.get` in one condition. Always wrap `for 0 to size-1` with a `if size > 0` guard.
- **Array Removal:** When deleting while iterating, loop backward: `for i = array.size(a) - 1 to 0`.
- **Global Mutation:** Return updated values from functions or use local temporary values. Pine rejects mutating global state inside functions.
- **Exports:** For exported library functions, `request.*()` calls must NOT depend on the arguments of the exported function.

## 6. Filesystem Safety Boundary

- Never delete files or directories outside the project root (`/Users/macmini/Trade/Bot/trading`).
- Never run destructive commands (`rm`, `mv`, overwrite/redirection) outside the project root.

## 7. Project Management SOPs (Active Tracking)

To maintain context across different AI sessions, this project uses a multi-file Markdown Kanban system in `.agents/`.
- **`.agents/sprint.md`** (Active features/hotfixes — **Max 3-5 items**)
- **`.agents/backlog.md`** (Future features, low priority ideas)
- **`.agents/bugs.md`** (Reported issues, triage statuses)
- **`.agents/changelog.md`** (Append-only log of finished work)

### SOP: Modifying the Tracker Files

**STRICT ENTRY FORMATTING:**
Every single entry across Sprint, Backlog, and Bugs must follow this exact schema:
`- [ ] [YYYY-MM-DD HH:MM] [Module/File] [Author: User|Codex|Gemini] Description.`

#### When the User Randomly Adds a New Feature:
1. **Acknowledge and Write:** Immediately append it to `.agents/backlog.md`.
2. **Format:** `- [ ] [YYYY-MM-DD HH:MM] [Module] [Author: User] Feature: Description.`
3. **Question:** Ask the user if they want to prioritize this immediately into `sprint.md` or leave it in the backlog.

#### When the User Reports a Bug:
1. **Acknowledge and Write:** Immediately append it to `.agents/bugs.md`.
2. **Format:** `- [ ] [YYYY-MM-DD HH:MM] [SEV:P0/P1/P2] [STATUS:OPEN] [Module] [Author: User] Bug: Description.`
3. **Triage:** Use `OPEN`, `IN_PROGRESS`, `BLOCKED`, `DONE`. Severity mapping: `P0` (Critical), `P1` (High), `P2` (Low).
4. **Action:** If the user implies it is critical (`SEV:P0`), move it directly to `sprint.md` and start fixing it.

#### When You Finish a Task (Feature or Bug Fix):
1. **Check Definition of Done (DoD):** Before closing a task, you MUST verify:
   - Code change is complete.
   - Tests run / Pine syntax compiled without errors.
   - Deploy check / Version numbers bumped safely.
   - Changelog appended with evidence.
2. **Remove:** Delete the item from `sprint.md` (or `bugs.md`/`backlog.md`).
3. **Append:** Move the completed entry down into `.agents/changelog.md`.
4. **Format:** `## YYYY-MM-DD` (Group by date heading) -> `- [x] [HH:MM] [Module] [Author: Gemini] Task: Description.`
5. **Output:** Proceed to print the standard `✅ Done / 🔜 Remaining / 📄 File Versions / 🧪 Test / Deploy` summary block.

## 8. Requirement Lifecycle Protocol (Global)

For all new user requirements/tasks:

1. Capture requirement in tracker files first (`backlog` or `bugs`).
2. Produce a detailed solution spec (scope, UX, data model, API changes, risks, test plan, rollout).
3. Wait for explicit user approval on the spec.
4. Only after approval, move to sprint and implement.

**Default behavior:** Do not write production code for new requirements unless the user explicitly asks to implement now.
