# Fullstack Feature Mode

Use this mode for feature delivery across backend + UI + checks with low coupling.

## Request Template

```text
Mode: Fullstack-Feature
Feature name:
Business goal:
In scope files/modules:
Out of scope:
Provider/API rules:
Acceptance criteria:
Risk level: low/med/high
Need deploy after done? yes/no
```

## Default Assignment Model

1. Agent A: backend owner
2. Agent B: UI owner
3. Agent C: verification/release owner

For small tickets, one agent may run `Fullstack + Tester`.

## Low-Coupling Rules

1. One ticket, one owner.
2. Declare file ownership before edits.
3. No edits outside owned files.
4. Use handoff template for blocked/done state.
5. Integrate in checkpoints, not constant cross-edits.

## Implementation Flow

1. Clarify contract and acceptance criteria.
2. Split work by file ownership.
3. Implement backend changes.
4. Implement UI wiring.
5. Run scoped checks.
6. Run integration gate.
7. Deploy (if requested) and verify.

## Provider/API Key Resolution Rule (Project-Specific)

When feature uses external provider keys:

1. First try user-scoped key from `user_settings` cache (Redis) using logged `user_id`.
2. If not found in cache, fallback to `.env` (`*_API_KEY`).
3. If both missing, return clear provider-specific error.
4. Keep backward compatibility with existing provider behavior.

Applies to providers like:
- `CLAUDE_API_KEY`
- `DEEPSEEK_API_KEY`
- `GEMINI_API_KEY`

## Required Handoff Data

1. Changed files
2. What changed
3. Checks run + output summary
4. Blockers/assumptions
5. Next owner (if any)

## Required Checks

Match touched code. Common commands:

- Backend syntax: `node --check webhook/server.js`
- UI build: `npm --prefix web-ui run build`
- Additional project checks from `rules/testing.md`

## Deploy Gate (if requested)

1. Pass required checks.
2. Bump build versions if backend/EA/UI/script changed.
3. Deploy with project deploy script.
4. Verify `/health` and core UI route.
5. Log work in `.agents/worklog.md`.
