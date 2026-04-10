# 0326-8 - one-pass hotfix

## Completed
- Fixed Pine syntax errors introduced by the previous bulk replacement in `Hung - MSS.pine`.
- Fixed Pine syntax errors introduced by the previous bulk replacement in `Hung - SMC.pine`.
- Removed invalid declarations like `string "..." = "..."` in both files.
- Kept direct string-literal `group="..."` input groups (valid and stable).
- Bumped file header version:
  - `src/Hung - MSS.pine` -> `@file-version: 0326-8`
  - `src/Hung - SMC.pine` -> `@file-version: 0326-8`
- Snapshot created at `src-versions/0326-8/` with changed files.

## Notes
- `Hung - Core.pine` remains `@file-version: 0326-7` because no code change was needed in this pass.

## Next actions
1. Compile and smoke-test `Hung - MSS.pine` and `Hung - SMC.pine` from `src-versions/0326-8`.
2. If compile is clean, continue one-pass cleanup: remove low-value score/limitation toggles that are still runtime-active but non-essential.
3. Then run a focused pass on redraw/update frequency (object update throttling by bar state) for extra speed gain.
