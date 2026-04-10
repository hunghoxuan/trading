# Project Documentation

Project docs are separated from agent memory and runtime files.

## Workspace Layout
- `/Users/macmini/Trade/Bot/Hung Bot/src`: project source code.
- `/Users/macmini/Trade/Bot/Hung Bot/docs`: project requirements, feature specs, references, roadmap.
- `/Users/macmini/Trade/Bot/Hung Bot/ai-agent`: reusable agent rules, error memory, temp/conversation memory.
- `/Users/macmini/Trade/Bot/Hung Bot/backups`: validated/working code backups.

## `docs/` Structure
- `features/`: one document per feature/module.
- `references/`: non-binding knowledge and external scripts.
- `schedule/`: planning and delivery tracking.

## Rules
1. `ai-agent/` is reusable and can be copied to other projects.
2. Project logic docs stay under `docs/`.
3. New snapshots go to `backups/` only after user-confirmed working status.
4. `versions/` is deprecated and removed.
5. Source files should include one latest trace header comment at file top:
- timestamp
- brief update
- features changed
- last backup file before that edit
6. Major update conversations should be summarized into `ai-agent/conversations/`.
7. For every important code update, documentation must be synced in the same batch:
- update impacted `docs/features/*.md` logic/progress
- update `docs/features/INDEX.md` if feature inventory or source-of-truth path changes
- update `docs/schedule/ROADMAP.md` tracking
8. Signal/entry terminology is strict:
- `EntrySignal` = setup queue only, before actual entry exists
- `Entry` = actual trade lifecycle object with entry/SL/TP/state
- setup counts and entry outcome stats must not be mixed in one dashboard bucket

## Reading Order
1. `docs/schedule/ROADMAP.md`
2. `docs/features/INDEX.md`
3. Relevant `docs/features/*.md`
4. `docs/references/INDEX.md`
