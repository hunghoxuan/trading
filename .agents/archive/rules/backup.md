---
description: Create a physical backup of the source code before modifying it
---

Run this workflow whenever requested to backup code, or whenever making major refactors, to ensure we have a safe restore point.
The backup directory is strictly `/Users/macmini/Trade/Bot/Hung Bot/backups/`.
Do NOT create backups in the `versions/` folder.

1. Use sortable naming format: `YYYYMMDD-index-note`.
2. Create backup folder under `/Users/macmini/Trade/Bot/Hung Bot/backups/`.
3. By default backup full `src/` before refactor:
`mkdir -p "/Users/macmini/Trade/Bot/Hung Bot/backups/20260325-01-refactor" && cp -R "/Users/macmini/Trade/Bot/Hung Bot/src" "/Users/macmini/Trade/Bot/Hung Bot/backups/20260325-01-refactor/"`
4. If user explicitly asks full-project backup, copy project folders required by user (not only `src`).

5. Reply explicitly with the created backup path.
