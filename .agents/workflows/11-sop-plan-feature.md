# SOP: Plan Feature

Goal: produce an approved, implementation-ready design before writing code.

## Steps

1. Read constraints from:
- `.agents/rules.md`
- `.agents/architecture.md`
2. Produce a concise spec containing:
- Scope and non-scope
- API/data/schema impacts
- UI/UX behavior (if applicable)
- Risk + rollback
- Test/deploy plan
3. Register status in `.agents/sprint.md` as `[DOING]` only when user wants this task prioritized now.
4. Ask explicit approval to proceed to coding.

## Approval Gate (Mandatory)

- No production code changes until user explicitly approves the spec.
- If approval is not explicit, keep task in planning state.
