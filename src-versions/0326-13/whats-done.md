# 0326-13 - Phase A (performance) final pass

## Completed
- Updated workflow rule memory file:
  - `WORKFLOW_RULES.md`
  - Locked process: master-plan phases only, one active phase, one-pass per phase, strict versioning/output format.

- `Hung - MSS.pine` performance-only optimization (no trade-logic rewrite):
  - Header updated to `@file-version: 0326-13`.
  - Added `calcOnClosedBar = barstate.ishistory or barstate.isconfirmed` at market-structure pipeline section.
  - Moved heavy intrabar computations into closed-bar gate:
    - pivot/mimic pivot chain (`ta.pivothigh/ta.pivotlow` LTF/HTF)
    - TF armed-state updates
    - trend-light updates
    - `process_data_market_structure(...)`
    - dynamic lookback recalculation block
    - `chartCtx := process_data_chart_context()`
  - Kept behavior intent aligned with existing bar-close signal gating.

## Why this is Phase-A safe
- Scope is performance path only; no new scoring/risk logic introduced.
- Main effect: reduce redundant realtime tick recomputation.

## Files to test
1. `src-versions/0326-13/Hung - MSS.pine`

## Next actions / big plan handoff
1. Freeze Phase A after your compile/behavior check.
2. Start Phase B: simplify low-value score/limitation branches while preserving hard-risk gates.
3. Keep checkpoint cadence per phase in `src-versions`.
