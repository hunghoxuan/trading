# Hung Bot Master Plan

## Purpose
Single roadmap source for medium/long-term improvements.  
Short-term execution details live in `roadmap/ACTIVE_SPRINT.md`.

## Priority Scale
- `P0`: critical reliability/correctness/performance blockers.
- `P1`: high-impact improvements for signal/trade quality.
- `P2`: exploratory enhancements and UX refinements.

## Current Roadmap Items

1. `P0` Simplify gates/scores/limitations
- Goal: reduce runtime overhead and remove non-measurable filters.
- Scope: SMC + MSS + Core signal/trade gating paths.
- KPI: fewer gate branches, stable compile/runtime, no behavior regressions.

2. `P1` Clarify `events` vs `signals` architecture
- Goal: define canonical roles and data flow (`signal -> event/trigger -> trade`).
- Scope: type definitions, queue ownership, prune policy, naming consistency.
- KPI: one clear pipeline documented and implemented consistently.

3. `P1` Bias/trend decision policy (HTF1 priority)
- Goal: resolve bias-vs-trend conflicts and choose deterministic direction rules.
- Scope: confluence logic in Core/SMC/MSS and dashboard semantics.
- KPI: explicit rule set (e.g., trend-only or trend+bias same-direction gate).

4. `P1` Trade size/length quality guard
- Goal: reject visually tiny or structurally weak trades.
- Scope: min trade height/width constraints in entry pipeline.
- KPI: reduced micro-trades without suppressing valid setups.

5. `P1` Trade risk regime scoring
- Goal: estimate contextual risk by leg phase and structural position.
- Scope: leg-phase model + HTF obstacle context + risk score gate.
- KPI: fewer counter-leg low-probability trades.

6. `P1` UI consistency and tooltip overhaul
- Goal: unify line-label placement and make compact high-signal tooltips.
- Scope: BOS/MSS/SWEEP + trade visuals + PDArray/Level/Signal tooltips.
- KPI: fewer overlaps, faster debug readability.

7. `P1` MSS HTF auto-fibo restore
- Goal: restore nearest HTF1/HTF2 leg auto-fibo visualization in MSS.
- Scope: MSS draw pipeline and HTF leg selection.
- KPI: fibo overlays match previous expected behavior.

8. `P0` EntryModel schema-driven trade config + condition engine
- Goal: move trade defaults and entry conditions into `EntryModel` to reduce per-model `if/else` branching.
- Scope:
  - Extend `EntryModel` fields used by Trade Config and gating:
    - `rr` (`0` = dynamic)
    - `entry_point` (`edge` default, plus middle/end)
    - `bias_ltf` (`0 off`, `1 trend`, `2 bias`)
    - `bias_htf1`, `bias_htf2`
    - `required_previous_events` (event prerequisites)
    - `bias_direction` (`long/short/na`)
    - optional: `max_active`, `risk_zone_pct`, `dynamic_tp_sl`, `entry_mode`.
  - Add one generic dynamic checker method for EntryModel conditions.
  - Migrate/retire global `Trade Config` settings after schema is stable.
- KPI: adding/changing entry models no longer requires custom `if/else` trade logic.

## Notes
- For each new feature request: decide `do now` vs `backlog` before implementation.
- Backlog items must be recorded here with priority and target scope.
