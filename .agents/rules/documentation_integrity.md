# Rule: Documentation Integrity

## Constraint
Feature documentation MUST be the primary source of truth. Tickets track the action, but Features describe the system.

## Requirements
- **Product Update on Inquiry**: Whenever asked about code, features, or facts, you MUST check if the corresponding doc in `.agents/.product/` is accurate and update it with any newly discovered info.
- **1 File per Feature**: Do not create duplicate feature docs. Maintain and update existing ones.
- **Linkage**: All features must be listed in [.agents/.product/tickets/feature_tracker.md].
- **Separation**: 
    - `features/` = User flow & behavior (End-user read).
    - `tickets/` = Implementation steps & bugs (Dev/AI read).
- **Update Cycle**: Any change to behavior or UI must trigger an update to the corresponding feature doc.
