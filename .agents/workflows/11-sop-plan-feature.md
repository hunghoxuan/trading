# SOP: Plan Feature

**Goal:** Ensure heavy/large tasks are scoped, approved, and tracked before wasting token limits on incorrect assumptions.

## 1. Write the Spec
- Open `.agents/sprint.md`.
- Add the task under `## Currently Doing` or `## Up Next` as a `[DOING]` or `[TODO]` item.
- Underneath the bullet, use italicized sub-bullets to build the plan:
  - *- Phase 1: Define X*
  - *- Phase 2: Refactor Y*

## 2. Check Architecture Constraints
- Read `.agents/rules.md`. Ensure the plan doesn't violate rules (e.g. modifying `Kit` files without a local replica first, if the rule exists, or bypassing DB schema rules).
- Review `architecture.md` (or update it if adding major modules).

## 3. Request Approval
- Present the spec directly to the user.
- Explicitly ask: "Does this plan look correct? Should I proceed with coding Phase 1?"
- Await the user's "Yes" before invoking `replace_file_content`.
