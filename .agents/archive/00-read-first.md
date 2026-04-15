---
description: Read index + active mode/workflow docs before any code changes
---

Before implementing bug fixes or features:

1. Read `SKILL.md` (Antigravity entry point).
2. Read `.agents/INDEX.md`.
3. Read active docs in this order:
   - `workflows/00-collaboration-rules.md`
   - applicable `workflows/*.md`
   - requested `modes/*.md` (if user selected a mode)
   - relevant `prompts/*.md` and `lexicon/project-terminology.md`
4. For bug fixes: also read `docs/common-errors.md` first — fix may already be documented.
3. If a mode is selected (`One-Pass`, `Planning`, `Brainstorm`, `Fix-Bug`, `Review`, etc.), follow that mode's response + output artifact requirements.
4. Publish one execution plan before code changes:
   - goal
   - scope
   - phases in execution order
   - done criteria
   - stop condition
5. Follow backup/versioning workflow.
6. Update docs when rules/behavior change.

Priority when conflicts exist:
1. Safety/backup workflow
2. Collaboration rules
3. KIT change policy
4. Coding standards
5. Doc sync
6. Task-specific workflow/mode
