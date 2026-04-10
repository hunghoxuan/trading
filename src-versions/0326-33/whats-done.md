# Version 0326-33 - Fix const input.string error

## Done
- Updated `src/Hung - MSS.pine` to `@file-version: 0326-33`.
- Fixed compile error at X mode input:
  - from series-based defaults/options (`CONST.*`) to const literals.
  - now uses: `input.string("Marker", options=["Marker","Event"])`.
- Updated `MASTER_PLAN_STATUS.md` MSS head -> `0326-33`.

## Next Actions
1. Compile and test `src-versions/0326-33/Hung - MSS.pine`.
2. If compile ok, continue immediately with the next planned one-pass block.
