# SOP: Execute Code

**Goal:** Write actual logic cleanly, predictably, and update tracking statuses without getting lost in the weeds.

## 1. Tool Selection
- Read target files first using `view_file` to capture exact indentation and structural boundaries.
- Utilize `replace_file_content` for adjacent logic changes.
- Utilize `multi_replace_file_content` to hit disparate sections of a file (e.g. `OnInit` at the bottom and `Input parameters` at the top) simultaneously.

## 2. Version Control
- IMMEDIATELY bump the file's internal version integer string after writing the logic.
- PineScript: `@file-version:` or `@lib-version:`.
- NodeJS: `SERVER_VERSION` or `package.json`.
- MQL5: `EA_BUILD_VERSION`.

## 3. Deployment / Test
- If it's a backend / script change, execute tests (e.g., compile checks, bash scripts).
- Run the deploy scripts (`13-sop-deploy.md`) if applicable.

## 4. Status Update (Completion)
1. Delete the task from `.agents/sprint.md` (or `.agents/bugs.md`).
2. Insert it at the top of `.agents/changelog.md` under today's date timestamp as `[COMPLETED]`.
3. Inform the user using the standard `# Task Completion Summary` format.
