# AI Agent Protocol

This folder is reusable across projects. Keep project-specific specs in `docs/`.

## Paths
- Project source: `/Users/macmini/Trade/Bot/Hung Bot/src`
- Project docs: `/Users/macmini/Trade/Bot/Hung Bot/docs`
- Agent memory/rules: `/Users/macmini/Trade/Bot/Hung Bot/ai-agent`
- Backups: `/Users/macmini/Trade/Bot/Hung Bot/backups`

## Core Rules
1. Preserve behavior first; optimize second.
2. Do not remove or rewrite core logic without explicit approval.
3. Report backup status in every implementation response.
4. Update roadmap after meaningful change batches.
5. After each important implementation update, sync documentation in `docs/`:
- update feature logic doc(s) impacted by the change
- update `docs/features/INDEX.md` if feature inventory/source path changed
- update `docs/schedule/ROADMAP.md` tracking
6. Stop expansion and fix compile/runtime errors first.
7. At the top of each source file changed, keep a single latest trace header comment with:
- timestamp
- brief update summary
- features added/changed
- last backup file used before the edit
8. Keep only the latest trace header entry in source files (full history stays in roadmap/changelog).

## Backup Policy
1. Create backup before high-risk code edits or when user asks.
2. Create "working" backup after user confirms TradingView compile/behavior.
3. Naming format:
- `<file>.bak_YYYYMMDD_HHMMSS_vX.Y.Z_<feature>_<status>`
4. Never overwrite old backups.

## Validation Policy
1. Treat TradingView compile + behavior check as mandatory for Pine changes.
2. If not validated by user, mark status `pending validation`.
3. Review `/Users/macmini/Trade/Bot/Hung Bot/ai-agent/errors/COMMON_ERRORS.md` before large edits.

## Communication Policy
1. Keep updates direct and brief.
2. Include:
- files changed
- backup status
- remaining queue
3. If environment cannot validate TradingView behavior, state it clearly.

## Conversation Memory Policy
1. Save a short summary in `/Users/macmini/Trade/Bot/Hung Bot/ai-agent/conversations/` for each major update batch.
2. Do not save every minor turn; major milestones only (feature complete, regression fix, structural refactor, documentation migration).
3. Use dated filenames for easy traceability.
