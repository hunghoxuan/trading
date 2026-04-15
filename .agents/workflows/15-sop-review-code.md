# SOP: Review Code

**Goal:** A strict, non-skippable self-review checklist the AI must run before finalizing a coding task and marking it as complete.

## Checklist

### 1. Variables & Orphans
- Did I declare a variable but never use it?
- Did I delete a variable that another part of the file still references?

### 2. Version Bumping
- Did I manually bump the version string INSIDE the file?
  - `server.js` -> `SERVER_VERSION`
  - `.mq5` -> `EA_BUILD_VERSION`
  - `.pine` -> `@lib-version: XX` or `@file-version: XX`

### 3. File Syntax (The "Unclosed Bracket" Check)
- Did the chunk replacement accidentally delete a closing `}` or bracket? (Very common AI mistake).
- If I'm unsure, I must run a syntax check (e.g., `node -c server.js`) before deploying.

### 4. Rule Adherence
- Pine Script: Did I maintain the strict 5-section layout?
- Node.js: Did I adhere to the local PM2/Postgres constraints?
- MQL5: Are my `OrderSelect` and `HistoryOrderSelect` logic branches distinct and safe?

*If any step is violated, I must fix it before outputting `## ✅ Done`.*
