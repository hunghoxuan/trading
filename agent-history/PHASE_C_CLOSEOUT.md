# Phase C Closeout

## Scope
- Cleanup dead settings/fields/branches with behavior-neutral guarantee.
- No redesign of trade logic.

## Completed
- SMC
  - Removed dead soft-score-related settings residue (`scoreSweep`, confluence-only residues already cleared in Phase B).
  - Removed dead HTF-only entry filter branch (`entryFilterHtfOnlyEnable`, `entryFilterHtfMinRank`).
- MSS
  - Removed dead config-builder setup branches by simplifying:
    - `get_detection_cfg(int setup)` -> `get_detection_cfg()`
    - `get_ui_cfg(int setup, CORE.Theme th)` -> `get_ui_cfg(CORE.Theme th)`

## Validation notes
- A/B/C scoped sweeps completed.
- Hard-risk and trade-score gates remain intact.
- Core still has candle-pattern aggregation for its own module usage; not changed in this phase.

## Freeze decision
- Phase C is closed and frozen.
