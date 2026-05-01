# Rule: Documentation Integrity

## Constraint
Feature documentation MUST be the primary source of truth. Tickets track the action, but Features describe the system.

## Requirements
- **1 File per Feature**: Do not create duplicate feature docs. Maintain and update existing ones.
- **Linkage**: All features must be listed in [.agents/tickets/feature_tracker.md].
- **Separation**: 
    - `features/` = User flow & behavior (End-user read).
    - `tickets/` = Implementation steps & bugs (Dev/AI read).
- **Update Cycle**: Any change to behavior or UI must trigger an update to the corresponding feature doc.
