---
description: Policy for bug fix and feature change when methods belong to KIT (CORE/SMC/UI)
---

Use this workflow whenever a bug fix or feature update touches a KIT method.

1. Do not edit KIT first.
2. Copy the target KIT method into the indicator file as a local clone helper.
3. Name the local clone helper as `{CORE/SMC/UI}_{method_name}`.
4. Implement fix/feature on the local clone helper.
5. Test and validate behavior locally in the indicator.
6. Keep KIT unchanged until user confirms the result is correct.
7. Only after user confirmation (or explicit request), copy the local clone code back into KIT.
8. Remove the local clone helper after KIT has been updated.

Notes:
- KIT is shared source of truth, but update is deferred until local validation is accepted.
- Local clone helper is a temporary sandbox for fast iteration and safe rollback.
