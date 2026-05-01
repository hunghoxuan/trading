# Agent Profiles (Editable)

Use these as defaults. Reassign by ticket complexity, not fixed role.
One agent can run multiple profiles in one ticket if scope is small.
For medium/large tickets, prefer one primary profile plus one secondary.

## 1) Scout
- Cost: low
- Speed: fast
- Best for: discovery, file mapping, quick root-cause scan
- Avoid: high-risk architecture changes

## 2) Builder
- Cost: medium
- Speed: medium-fast
- Best for: fullstack feature implementation and routine bugfixes
- Avoid: broad refactor without clear ownership

## 3) Reviewer
- Cost: medium
- Speed: fast
- Best for: regression review, missing tests, diff risk scan
- Avoid: becoming primary implementer unless reassigned

## 4) Architect
- Cost: high
- Speed: slower
- Best for: migration design, complex cross-module contracts
- Avoid: routine tickets

## 5) Release
- Cost: medium
- Speed: medium
- Best for: final checks, deploy sequencing, post-deploy verification
- Avoid: starting feature work while release gate is active

## 6) UI-Designer
- Cost: medium
- Speed: medium
- Best for: layout, interaction polish, visual hierarchy, usability refinements
- Avoid: changing backend contracts without explicit ownership

## 7) Product Owner
- Cost: medium
- Speed: medium
- Best for: priority decisions, acceptance criteria, scope cuts, go/no-go calls
- Avoid: direct implementation unless explicitly assigned

## 8) BA (Business Analyst)
- Cost: low-medium
- Speed: fast
- Best for: requirement clarification, edge-case enumeration, mapping user flow to tasks
- Avoid: deep refactor decisions without technical owner review

## 9) Tester
- Cost: low-medium
- Speed: fast
- Best for: test case design, regression validation, bug reproduction notes
- Avoid: owning feature implementation and release sign-off at same time

## 10) Fullstack Developer
- Cost: medium
- Speed: medium-fast
- Best for: small/medium feature tickets spanning API + UI + checks
- Avoid: concurrent ownership of overlapping files across many tickets

## Reassignment Rules

1. Any agent can switch role on next ticket.
2. If blocked > 10 minutes, agent picks next independent ticket.
3. Keep one active release owner when multiple tickets converge.
4. Multiple profile mode is allowed:
   - Small ticket: `Fullstack + Tester`
   - Ambiguous ticket: `BA + Builder`
   - Polish pass: `UI-Designer + Reviewer`
