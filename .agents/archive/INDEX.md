# .agents Index

This folder is the editable operating system for AI collaboration in this repo.
Entry point for Antigravity skill system: `SKILL.md`.

## Start Here
- `SKILL.md`: Antigravity skill entry point — read before any code changes.
- `AGENT-ONBOARDING.md`: **full onboarding for new agents** — architecture, rules, multi-agent patterns, quick reference.
- `00-read-first.md`: mandatory startup checklist before implementation.

## Rules
- `rules/backup.md`: backup policy and naming (`MMdd-{index}`).
- `rules/coding-standards.md`: naming, section order, context ownership, runtime/docs standards.
- `rules/kit-change-policy.md`: local-clone-first policy when changing KIT methods.
- `rules/pine-error-prevention.md`: durable Pine compile/runtime pitfalls.
- `rules/architecture-principles.md`: architecture principles validated from codebase evolution.

## Workflows
- `workflows/00-collaboration-rules.md`: collaboration contract, one-pass/BIG-PASS behavior.
- `workflows/01-backup-workflow.md`: backup-first before risky edits/refactor.
- `workflows/02-kit-change-policy.md`: KIT edit flow (clone local -> validate -> promote).
- `workflows/03-context-ownership.md`: shared context ownership and runtime context gate.
- `workflows/04-doc-sync.md`: keep docs aligned when code behavior changes.
- `workflows/05-signal-emission-gate.md`: no-backfill signal emission gate.
- `workflows/06-execution-discipline.md`: master-plan-first and one-pass policy.
- `workflows/07-conversation-resume.md`: resume unresolved work from prior chat safely.

## Modes (how to run work)
- `modes/one-pass.md`
- `modes/overnight.md`
- `modes/deep-review.md`
- `modes/hotfix.md`
- `modes/discovery-design.md`
- `modes/planning.md`
- `modes/brainstorm.md`
- `modes/fix-bug.md`
- `modes/review.md`
- `modes/continue-previous-conversation.md`

## Prompts (how to control replies)
- `prompts/response-style.md`: structure, tone, depth, strictness.
- `prompts/planning-control.md`: planning mode, auto-continue, stop conditions.

## Templates
- `templates/one-pass-template.md`
- `templates/overnight-template.md`
- `templates/review-template.md`
- `templates/feature-spec-template.md`
- `templates/bug-report-template.md`
- `templates/context-handoff-template.md`
- `templates/planning-mode-template.md`
- `templates/brainstorm-mode-template.md`
- `templates/fix-bug-mode-template.md`
- `templates/review-mode-template.md`
- `templates/big-pass-template.md`
- `templates/continue-previous-conversation-template.md`

## Mode Outputs
- `output/planning/`
- `output/brainstorm/`
- `output/fix-bug/`
- `output/review/`
- `output/continue-context/`

## Lexicon
- `lexicon/project-terminology.md`: abbreviations/terms used in this project.

## Roadmap
- `roadmap/MASTER_PLAN.md`
- `roadmap/ACTIVE_SPRINT.md`

## Decisions
- `docs/decisions/`: decision notes and technical rationale.
- `docs/common-errors.md`: confirmed bug log — update after every bug fix.

## History (outside .agents)
- `../agent-history/MASTER_PLAN_STATUS.md`
- `../agent-history/PHASE_C_CLOSEOUT.md`
