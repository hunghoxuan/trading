---
description: Read project workflows first before any code changes
---

Before implementing any bug fix or feature:

1. List files in `.agents/workflows/`.
2. Read all relevant workflow files for the current request.
3. Follow workflow constraints during implementation.
4. If a new team rule is added, store it as a workflow in this folder.

Priority order when multiple workflows apply:
1. Safety / backup workflow
2. KIT change policy workflow
3. Coding standards workflow
4. Task-specific workflow
