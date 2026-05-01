# Planning Mode

Use this mode to break down complex features into executable tickets and dependency-aware roadmaps.

## Request Template

```text
Mode: Planning
Goal: (The end feature or epic)
Scope: (What's in/out)
Criteria: (What does "Done" look like?)
Need Tickets? yes/no
```

## Implementation Flow

1.  **Scope Refinement**:
    - Outline the user flow and required backend/frontend components.
    - Identify required external APIs (check `.product/architecture/external_apis.md`).
2.  **Dependency Mapping**:
    - Identify what must be built first (e.g., DB Schema -> API -> UI).
    - Highlight potential blockers or integration gates.
3.  **Ticket Breakdown**:
    - Create structured tasks in `.agents/.product/tickets/`.
    - Ensure each ticket has clear acceptance criteria.
4.  **Risk Assessment**:
    - Identify high-risk areas (e.g., MT5 sync stability).
    - Propose mitigation steps or "POC" tasks.

## Rules
- **Atomic Tasks**: Each ticket should be small enough to be completed by an agent in one session.
- **Traceability**: All plan items must link back to a Capability in `feature_tracker.md`.
