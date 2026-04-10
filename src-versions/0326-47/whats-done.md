# 0326-47 - Local-first Header Row (Kit rollback)

## Completed
- Rolled back `Kit - UI` API changes (no new args, no rowOffset extension).
- Kept header behavior using local logic only in indicators:
  - Core / SMC / MSS now draw bias row at `row 0` after stats render.
- Result: local test path first, no long-term Kit API migration yet.

## Versions
- `Hung - Core.pine` -> `@file-version: 0326-47`
- `Hung - SMC.pine` -> `@file-version: 0326-47`
- `Hung - MSS.pine` -> `@file-version: 0326-47`

## Notes
- This exactly follows your rule: use local/UI_ path now, move to Kit later when stabilized.

## Next Actions
1. Compile Core/SMC/MSS from `src-versions/0326-47`.
2. Verify header row always stays top with `CORE/SMC/MSS` and TF arrows.
