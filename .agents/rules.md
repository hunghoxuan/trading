# Project Rules (Short)

## 1) Execution Defaults
- Never change UI, layout, feature behavior, DB schema, tech stack, or architecture without confirmation first.
- Before implementation, always provide a detailed design/plan and proposed solution covering relevant UI, layout, DB schema, technical approach, and tech stack choices.
- Always include confirmation questions and wait for approval before implementing, unless the user explicitly asks for immediate execution or the task is a pure inspection/read-only request.
- Use one-pass execution for clear requests.
- Auto test + auto deploy when technically possible unless user says otherwise.
- For code changes, run real checks and report actual results.
- If no manual action is required, do not show a "Manual tasks" section.

## 2) Build & Deploy
- For backend/EA/UI/scripts changes, always bump both build versions:
  - `webhook/server.js` (`SERVER_VERSION`)
  - `mql5/TVBridgeEA.mq5` (`EA_BUILD_VERSION`)
- Use `bash scripts/bump_build_versions.sh`.
- Deploy guard is `bash scripts/check_build_versions.sh origin/main`.
- Preferred deploy command: `bash scripts/deploy_webhook.sh`.

## 3) Database Rules
- Production storage is Postgres.
- Verify storage/health before DB operations: `https://signal.mozasolution.com/mt5/health`.
- Core identity rule:
  - `id BIGSERIAL` = internal joins/updates/deletes.
  - `sid TEXT UNIQUE NOT NULL` = human-facing UI/API identifier.
- Keep legacy IDs during migration (`signal_id`, `trade_id`, etc.) for compatibility.
- UI shows/searches by `sid`; backend accepts `id`, `sid`, and legacy IDs.

## 4) UI Rules
- Follow [skills/ui-web-frontend.md](./skills/ui-web-frontend.md).
- Form feedback colors: error red, warning yellow, success green.
- Validation message appears directly below related input.
- Form-level error appears above action buttons.

## 5) Architecture & Safety
- Preserve user-facing behavior unless explicitly asked to change it.
- Never run destructive operations outside project root.
- Never delete system files: `.agents/*`, `AI.md`, `.cursorrules`.

## 6) Multi-Agent Collaboration
- Use [sync/MAILBOX.md](./sync/MAILBOX.md) for handoff.
- Track active work in [plans/sprint.md](./plans/sprint.md).
- Put domain lessons in `knowledge/` to avoid repeated debugging.
- Respect ownership in sprint tasks (`[TODO: ...]`).

## 7) Session & Context Hygiene
- **Mandatory Summary**: Before ending a conversation (or when requested), ALWAYS update `.agents/worklog.md` with a summary of work done and pending backlog.
- **Resuming Context**: At the start of EVERY new conversation, the first step MUST be to read `.agents/worklog.md`.
- Follow [skills/session-management.md](./skills/session-management.md).
- **Caveman Mode**: Adopt extremely concise communication style to save tokens. Use [skills/token-optimization.md](./skills/token-optimization.md).
