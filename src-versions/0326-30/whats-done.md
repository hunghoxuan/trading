# Version 0326-30 - Remove inline "x" when X marker is present

## Done
- Updated `src/Hung - MSS.pine` to `@file-version: 0326-30`.
- In BOS/MSS invalidation flow:
  - Removed inline ` x` tagging on line label.
  - Keep only marker signal (`X` / `X↑`) as invalidation indicator.
- Added cleanup behavior:
  - If label text already contains ` x` from older versions, it is stripped on invalidation update.
- Updated `MASTER_PLAN_STATUS.md` MSS head -> `0326-30`.

## Next Actions
1. Compile and test `src-versions/0326-30/Hung - MSS.pine`.
2. Verify invalidation now shows marker only, while line text remains `BOS/MSS` without `x`.
3. If you want, next pass can also strip historical ` x` labels globally (not only on new invalidation events).
