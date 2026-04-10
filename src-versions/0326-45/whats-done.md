# 0326-45 - Label Dot Position Fix

## Completed
- Fixed Trade Models label format:
  - from `TR. - Trend`
  - to `TR - Trend.`
- Applied across Core / SMC / MSS.
- Dot now appears after long name (as requested), not after short code.

## Versions
- `Hung - Core.pine` -> `@file-version: 0326-45`
- `Hung - SMC.pine` -> `@file-version: 0326-45`
- `Hung - MSS.pine` -> `@file-version: 0326-45`

## Next Actions
1. Compile Core/SMC/MSS from `src-versions/0326-45`.
2. Verify labels in Trade Models list show `SHORT - Long Name.` format.
