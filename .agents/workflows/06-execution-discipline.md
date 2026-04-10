---
description: Plan-first and one-pass execution discipline
---

Apply for all implementation tasks.

1. Before coding, publish one master plan with:
   - goal
   - fixed scope/files
   - phase order
   - done criteria
   - explicit stop condition
2. If task is small/mechanical (rename, formatting, pure refactor), execute in one-pass.
3. Avoid unnecessary intermediate checkpoints for one-pass tasks.
4. Do not introduce new sub-tasks outside approved scope.
5. After finishing a phase, report only:
   - completed items
   - what remains from original plan

## Feature vs Bug Handling

6. Classify incoming request first:
   - `Feature` (new capability, non-urgent design work)
   - `Bug/Hotfix` (regression, error, small change, or explicit "do now")
7. For `Feature` requests:
   - ask whether to implement now or backlog.
   - if backlog, assign priority (`P0/P1/P2`) and rough effort.
   - record the item in roadmap docs before ending the turn.
8. For `Bug/Hotfix` or explicit "do now":
   - implement immediately (one-pass when possible).
   - append a short changelog note to active sprint/backlog docs.
9. Do not start speculative refactors for backlog features unless user explicitly approves "do now".

## Conversation Health

10. Continuously self-check conversation quality when thread is long.
11. If 2+ degradation signals appear, propose creating a new conversation immediately.
Degradation signals:
   - repeated conclusions or unstable decisions
   - forgetting recently agreed constraints
   - frequent small patch/context mismatches
   - repeated full re-scan for small tasks
12. Before proposing new conversation, provide compact handoff:
   - current state
   - changed files
   - single next step

## Overnight Autonomous Mode

13. When local system time is in overnight window (`23:00-07:00` Europe/Berlin), run in autonomous multi-step mode by default.
14. In overnight mode, do not request per-step confirmations for planned phases that were already approved.
15. Still stop and ask before:
   - destructive actions
   - scope changes outside approved plan
   - ambiguous product decisions with multiple valid interpretations
16. Overnight mode implementation constraints:
   - work on indicator files first.
   - if KIT change is needed, clone method locally into indicator (`CORE_`, `SMC_`, `UI_`) and validate there first.
17. At phase boundaries, provide compact status + next phase, but continue automatically unless blocked by rule 15.

## BIG-PASS Mode (User-Triggered)

18. When user explicitly says `BIG-PASS` (or equivalent), switch to macro-package execution:
   - no micro incremental patches,
   - no per-step confirmation requests unless blocked.
19. For each package in BIG-PASS mode, must complete:
   - implementation,
   - version bump + `src-versions/MMdd-{index}` snapshot,
   - `whats-done.md`,
   - roadmap/status sync.
20. After each package, report only:
   - completed,
   - next package,
   - ETA.
21. Continue automatically to next package until:
   - full feature goal is done, or
   - hard blocker appears.
