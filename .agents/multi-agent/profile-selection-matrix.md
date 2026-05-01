# Profile Selection Matrix

Use this to choose profile combinations by ticket size, coupling, and risk.

## Legend

- Size: `S` (small), `M` (medium), `L` (large)
- Risk: `Low`, `Med`, `High`
- Coupling: `Low` (independent files), `High` (shared files/contracts)

## Matrix

1. `S + Low risk + Low coupling`
- Primary: `Fullstack Developer`
- Secondary: `Tester` (same agent)
- Mode: single-agent

2. `S + Med risk + Low coupling`
- Primary: `Builder`
- Secondary: `Reviewer` (same or second agent)
- Mode: single-agent or feature-pod

3. `M + Low risk + Low coupling`
- Primary: `Fullstack Developer` (per feature)
- Secondary: `Tester` (floating)
- Mode: parallel-feature

4. `M + Med risk + Low coupling`
- Primary: `Builder` (per feature)
- Secondary: `BA` for edge cases, `Reviewer` for regression
- Mode: parallel-feature + integration gate

5. `M + High risk + Medium coupling`
- Primary: `Architect` (contract/design first)
- Secondary: `Builder` + `Tester`
- Mode: dependency-chain with explicit gates

6. `L + Any risk + High coupling`
- Primary: `Architect` + `Product Owner` for scope slicing
- Secondary: multiple `Builder`s with strict file ownership
- Final: `Release` owner for verification/deploy
- Mode: staged rollout, batched integration

7. `UI-heavy ticket`
- Primary: `UI-Designer`
- Secondary: `Fullstack Developer` (implementation), `Tester` (cross-device checks)
- Mode: feature-pod

8. `Requirement unclear ticket`
- Primary: `BA`
- Secondary: `Product Owner` for acceptance criteria
- Then: `Builder` for implementation
- Mode: clarify-first

9. `Hotfix / incident`
- Primary: `Builder` (fast patch)
- Secondary: `Tester` (targeted regression), `Release` (deploy verify)
- Mode: hotfix swarm

## Profile Composition Rules

1. Small ticket: one agent may hold 2 profiles.
2. Medium ticket: one primary profile per agent; secondary only if needed.
3. Large ticket: avoid multi-profile overload on a single agent.
4. Never combine `implementer + final release approver` on high-risk deploys.

## Quick Picker

1. If ticket is independent and < 4 files: `Fullstack + Tester`.
2. If UI polish: `UI-Designer + Reviewer`.
3. If unclear requirements: `BA + Product Owner`, then `Builder`.
4. If risky infra/API change: `Architect -> Builder -> Tester -> Release`.
