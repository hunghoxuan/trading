---
description: KIT change workflow (local clone first)
---

1. If a fix touches KIT method logic, clone method locally in indicator first.
2. Name clone with strict prefix:
- `CORE_<method_name>`
- `SMC_<method_name>`
- `UI_<method_name>`
3. Validate behavior in indicator.
4. Only promote back to KIT after explicit user confirmation/request.
5. Remove local clone after KIT promotion.
6. Keep KIT untouched during local iteration to reduce repeated KIT recompiles.
