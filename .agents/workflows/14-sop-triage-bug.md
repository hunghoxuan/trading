# SOP: Triage Bug

Goal: register and classify bugs before implementation.

## Steps

1. Understand symptom, scope, and likely failing module.
2. Add bug to `.agents/bugs.md` using strict format:
- `- [ ] [YYYY-MM-DD HH:MM] [SEV:P0/P1/P2] [STATUS:OPEN] [Module/File] [Author: User] Bug: <description>.`
3. Decide severity:
- `P0`: production outage/data corruption
- `P1`: high-impact functional failure
- `P2`: minor/limited impact
4. Propose root-cause hypothesis and fix plan.
5. Ask approval before coding.

## Critical bug fast-path

- For `SEV:P0`, move to sprint immediately as `[DOING]` and start fix execution.
