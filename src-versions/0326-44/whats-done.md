# 0326-44 - Entry Models Label Format

## Completed
- Updated Trade Models labels to format:
  - `{short}. - {long}`
- Applied across:
  - `Hung - Core`
  - `Hung - SMC`
  - `Hung - MSS`
- Removed visible labels for per-model `When/Type` selectors by setting title to empty string (`""`).

## Versions
- `Hung - Core.pine` -> `@file-version: 0326-44`
- `Hung - SMC.pine` -> `@file-version: 0326-44`
- `Hung - MSS.pine` -> `@file-version: 0326-44`

## Next Actions
1. Compile Core/SMC/MSS from `src-versions/0326-44`.
2. Verify Trade Models settings UI:
   - name format shows `{short}. - {long}`
   - no visible `When`/`Type` labels.
