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
4. If a compile/runtime error may be caused by KIT version mismatch (API/signature mismatch), ask user to confirm KIT version before applying code fixes.
5. Do not add new user-facing Settings/inputs unless the user explicitly asks for them.

## BIG-PASS / Overnight Mode
1. Trigger phrase examples:
   - `Mode: BIG-PASS`
   - `Continue in BIG-PASS mode`
   - `Overnight mode on`
2. Behavior:
   - Execute macro packages only (no micro 2-3 line steps).
   - Auto-continue package-to-package until goal is complete.
   - Do not ask confirmation unless blocked/ambiguous.
3. Required output after each package:
   - `Completed`
   - `Next package`
   - `ETA`
4. Each package must include:
   - code changes
   - version bump in changed Pine files
   - snapshot in `src-versions/MMdd-{index}`
   - `whats-done.md`
   - roadmap/status sync
5. Stop conditions:
   - Goal fully complete, or
   - hard blocker requiring user decision.
