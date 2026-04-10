# Version 0326-31 - Fix undeclared htf2 compile error

## Done
- Updated `src/Hung - MSS.pine` to `@file-version: 0326-31`.
- Fixed compile error `Undeclared identifier 'htf2'` in TF-priority helper.
- Change:
  - `get_data_tf_priority(...)` now fetches HTF pair locally via `CORE.get_htf_pair()` instead of referencing global `htf1/htf2` before declaration.
- Updated `MASTER_PLAN_STATUS.md` MSS head -> `0326-31`.

## Next Actions
1. Compile and test `src-versions/0326-31/Hung - MSS.pine`.
2. Verify LIQ overlap priority still works (`HTF2 > HTF1 > LTF`) with no compile/runtime issue.
