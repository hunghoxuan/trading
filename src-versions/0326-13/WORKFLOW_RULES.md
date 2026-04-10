# Workflow Rules (Locked)

## Planning Discipline
1. Always follow the approved master plan phases in order.
2. Do not split into ad-hoc micro tasks outside the active phase.
3. At any time, only one active phase is allowed.

## Phase Execution
1. Each phase is delivered as one-pass.
2. Scope must stay within phase objective.
3. Prefer performance-safe changes first (no trade-logic changes) unless phase explicitly says otherwise.

## Versioning
1. Use `src-versions/MMdd-{index}` (index increases per day).
2. Each version folder must include:
   - changed file copies
   - `whats-done.md`
3. Update `@file-version` header in every changed Pine file.

## Completion Format
1. List `Completed` items.
2. List `Next actions / plan`.
3. Tell user exactly which files to compile/test in the new version folder.

## Collaboration Contract
1. Keep `src/` as the latest working version.
2. Do not wait by default; continue to next planned action unless user pauses.
3. If user updates rule, this file must be updated first.
