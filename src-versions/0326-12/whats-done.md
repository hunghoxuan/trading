# 0326-12 - final one-pass before big plan

## Completed
- File changed: `Hung - SMC.pine`.
- Header bumped: `@file-version: 0326-12`.
- Performance cleanup (safe, logic-preserving):
  - Moved pivot-heavy calculations (`ta.pivothigh/ta.pivotlow` chain for LTF/HTF mimic) fully inside `if calcOnClosedBar`.
  - Kept TF armed-state update + trend-light update inside closed-bar scope.
  - Moved local pivot references (`hv/lv`) to compute only on closed bars.
- Result: fewer intrabar calculations on realtime ticks, without changing bar-close signal intent.

## Snapshot
- `src-versions/0326-12/Hung - SMC.pine`
- `src-versions/0326-12/whats-done.md`

## Next actions (big plan)
1. Define large refactor scope: score/limitation simplification matrix (keep hard-risk checks, remove low-value soft scoring).
2. Create migration map for settings cleanup (deprecate low-value inputs, preserve stable defaults).
3. Execute phased plan by module: `SMC` -> `MSS` -> `Core`, with versioned checkpoints per phase.
