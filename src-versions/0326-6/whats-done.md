# 0326-6

## whats done
- MSS cleanup (safe, no behavior change):
  - Removed always-false `recalcByN` branch from dynamic recalc condition.
  - Removed redundant alias `htf2AnchorTsFinal` (used direct `htf2SwingAnchorTs`).
  - Removed redundant PDH/PDL local aliases (`d_h`, `d_l`, `d_t`), use `chartCtx` directly.
- SMC cleanup (safe, no behavior change):
  - Removed always-false `recalcByN` branch from dynamic recalc condition.
- Updated source headers to `@file-version: 0326-6`.

## changed files
- Hung - MSS.pine
- Hung - SMC.pine
- Hung - Core.pine (header version bump)
