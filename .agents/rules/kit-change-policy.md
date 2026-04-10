---
description: Policy for bug fix and feature change when methods belong to KIT (CORE/SMC/UI)
---

Use this workflow whenever a bug fix or feature update touches a KIT method.

Primary goal:
- Minimize KIT recompilation churn during iteration.
- Prevent wrong fixes caused by using a different KIT version than the compile environment.

Preflight rule (mandatory):
1. If a compile/runtime error can be explained by KIT API/signature mismatch, ask user to confirm the active KIT version before applying code fixes.
2. Treat version confirmation as a gate. Do not patch call sites until this check is done.

Workflow:
1. Do not edit KIT first.
2. Copy the target KIT method into the indicator file as a local clone helper.
3. Name the local clone helper with fixed prefix:
- `CORE_<method_name>`
- `SMC_<method_name>`
- `UI_<method_name>`
4. Implement fix/feature on the local clone helper.
5. Test and validate behavior locally in the indicator.
6. Keep KIT unchanged until user confirms the result is correct.
7. Only after user confirmation (or explicit request), copy the local clone code back into KIT.
8. Remove the local clone helper after KIT has been updated.

Notes:
- KIT is shared source of truth, but update is deferred until local validation is accepted.
- Local clone helper is a temporary sandbox for fast iteration and safe rollback.
- Default mode: no direct KIT edits unless user explicitly asks to promote validated local clone back to KIT.
- Prefix requirement above is mandatory so local clones are easy to grep/replace in one pass.
