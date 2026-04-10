---
description: Create a physical backup of the source code before modifying it
---

Run this workflow whenever requested to backup code, or whenever making major refactors, to ensure we have a safe restore point. 
The backup directory is strictly `/Users/macmini/Trade/Bot/Hung Bot/backups/`. 
Do NOT create backups in the `versions/` folder.

// turbo
1. Create a backup directory and copy all of the `/src/` source files into it using a timestamped folder name:
`mkdir -p "/Users/macmini/Trade/Bot/Hung Bot/backups/src_backup_$(date +%Y%m%d_%H%M%S)" && cp -r "/Users/macmini/Trade/Bot/Hung Bot/src/"* "/Users/macmini/Trade/Bot/Hung Bot/backups/src_backup_$(date +%Y%m%d_%H%M%S)/"`

2. Reply to the user explicitly stating the path to the backup folder that was just created, so they can keep track of it or access it if compilation fails.
