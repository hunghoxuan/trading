# Mode: Planning

Goal: produce a clear execution plan before coding.

## Thinking profile
- Depth: high on scope/risk/dependencies.
- Bias: structure-first, avoid premature implementation.

## Behavior
1. No code changes unless user explicitly asks.
2. Convert request into phases with done criteria.
3. Identify blockers, assumptions, and stop conditions.

## Response format
1. Goal
2. Scope (in/out)
3. Phases (ordered)
4. Risks + mitigations
5. Decision points

## Output artifact
- Folder: `.agents/output/planning/`
- File pattern: `plan-YYYYMMDD-HHMM-{topic}.md`
- Required sections in file:
  - goal
  - scope
  - phase plan
  - done criteria
  - risks
