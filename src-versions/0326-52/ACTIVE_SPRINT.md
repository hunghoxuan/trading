# Active Sprint

## Sprint Goal
Improve signal/trade pipeline clarity and reduce unnecessary runtime cost.

## Doing
1. Audit and reduce non-essential gate/score/limitation branches (`P0`).
2. Apply Wave-1 safe cut list from inventory (`P0`).

## Next
1. Write `events vs signals` canonical model and prune policy (`P1`).
2. Define HTF1-priority trend/bias direction policy (`P1`).
3. Apply Wave-1 gate cuts in SMC, then MSS, then Core (`P0`).
4. Add trade minimum size/length filters (`P1`).
5. Design leg-phase risk scoring for trade gating (`P1`).
6. Unify line-label placement + compact tooltip overhaul (`P1`).
7. Restore MSS nearest HTF1/HTF2 auto-fibo (`P1`).
8. Clarify `$$$` vs `IDM` and normalize line extension policy (`P1`).
9. Prepare entry-model-level trade config migration plan (`P2`).
10. Implement `EntryModel` schema-driven dynamic trade config/checker (`P0`):
- Add `rr`, `entry_point`, `bias_ltf`, `bias_htf1`, `bias_htf2`, `required_previous_events`, `bias_direction` (+ optional runtime fields).
- Move global Trade Config behavior into EntryModel defaults.
- Replace per-entry-model branching with one generic condition-check method.

## Done
1. Performance round pass:
- Core: strategy-meta per-bar cache + reduced duplicate target lookups.
- MSS: reduced duplicate strategy-meta calls in Sweep->MSS->FVG path.
- SMC: invariant extraction in add-entry loop.
2. EntryModel dynamic foundation pass (`0326-50`):
- Added shared-shape local dynamic config/checker methods in Core/SMC/MSS.
- Wired model-level RR/risk/bias checks through config bridge from legacy Trade Config.
- Kept legacy settings active as compatibility bridge (migration not fully complete yet).
3. EntryModel per-model defaults + required-events parser (`0326-52`):
- Replaced bridge defaults with per-model config maps (Core/SMC/MSS).
- Added tokenized `required_previous_events` parser + per-model lookback window.
- Started decoupling from global `3. Trade Config` in SMC/MSS add-entry gates.

## Change Log
- Added workflow rule: `Feature vs Bug` classification and execution policy.
- Created roadmap/docs structure in `.agents`.
- Added Gate Inventory v1 for Core/SMC/MSS and Wave-1 cut strategy.
- Applied Wave-1 cut #1: disabled `near-leg` + `HTF-only` structural entry filters in SMC/MSS strict profiles.
- Added canonical semantics doc for `signal` vs `event`.
- Added conversation-health rule: proactively suggest new conversation when long-thread quality degrades.
- Reinforced mandatory auto-sync of rules/docs/roadmap/sprint after material changes.
- Added UI/tooltip/auto-fibo/trade-config feature notes from 2026-03-26.
- Added overnight autonomous mode rule (time-based) with backup-per-feature and ordered test handoff.
- Applied Wave-1 cut #2: reduced confluence gate impact (trade-score is primary trade gate) in SMC/MSS.
- Applied Trend > Bias priority in entry direction gate for SMC/MSS (trend known => trend; else fallback bias).
