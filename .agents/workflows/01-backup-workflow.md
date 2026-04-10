---
description: Backup-first workflow before refactor or risky edits
---

1. Create a full `src/` backup in `backups/YYYYMMDD-index-note/` before refactor.
2. Use sortable names: `YYYYMMDD-index-note`.
3. Do not continue refactor if backup step fails.
4. In overnight mode, create backup at each feature boundary:
   - before starting a new feature
   - after finishing a feature
5. After overnight run, publish test order based on backup sequence:
   - newest feature backup first
   - then previous feature backups in reverse chronological order
