---
name: hung-bot-agent
description: Operating rules, workflows, and collaboration guidelines for the Hung Bot Pine Script trading system. Read this skill before making any code changes in this repository.
---

# Hung Bot Agent Skill

This skill defines the operating rules and collaboration contract for AI agents working on the Hung Bot TradingView Pine Script codebase.

## Mandatory Startup

Before any code changes, read in order:
1. `AGENT-ONBOARDING.md` — **start here for new agents** (full context, architecture, all rules)
2. `00-read-first.md` — startup checklist and priority order
3. `workflows/00-collaboration-rules.md` — collaboration contract
4. Applicable workflow files for the task type

## Priority Order (conflicts)
1. Safety / Backup
2. Collaboration rules
3. KIT change policy
4. Coding standards
5. Doc sync
6. Task-specific workflow

## Key Files
- `AGENT-ONBOARDING.md`: **full onboarding for new agents** — architecture, rules, examples, multi-agent collaboration
- `rules/` — immutable technical rules (backup, coding standards, KIT policy, Pine pitfalls)
- `workflows/` — task-specific step-by-step procedures (slash commands `/01` to `/07`)
- `docs/common-errors.md` — confirmed bug log to prevent repeated diagnoses
- `docs/decisions/` — architecture decision records
