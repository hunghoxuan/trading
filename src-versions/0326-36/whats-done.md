# 0326-36 - Core Compile Hotfix

## Completed
- Fixed Pine syntax error at line 124 in `Hung - Core`.
- Replaced invalid string-literal assignment style:
  - from: `"1. UI Config" = "1. UI Config"`
  - to valid constants: `GROUP_UI_CONFIG`, `GROUP_TRADE_MODELS`, `GROUP_TRADE_CONFIG`, `GROUP_TRADE_DISPLAY`.
- Updated Core header:
  - `@file-version: 0326-36`
- Synced head in `MASTER_PLAN_STATUS.md`.

## Next Actions
1. Compile `Hung - Core` from version `0326-36`.
2. If compile/chart OK, continue one-pass large cleanup as planned (behavior-neutral config unification only).
